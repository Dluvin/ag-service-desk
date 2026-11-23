/**
 * Import Live Oak map-pin pivots into the American Irrigation dealership.
 * Idempotent: creates Live Oak store, customers, farms, contacts, and pivots as needed.
 */
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const STORE_NAME = "Live Oak";
const UNASSIGNED_NAME = "Unassigned";
const CSV_PATH = path.join(__dirname, "..", "data", "live-oak-pivots.csv");

/** Normalize duplicate customer spellings from the map export. */
const CUSTOMER_ALIASES = new Map([
  ["83 farms", "83 Farms LLC"],
  ["allaince", "Alliance"],
  ["alliance dairy trenton", "Alliance Dairy - Trenton"],
  ["alliance diary - trenton", "Alliance Dairy - Trenton"],
  ["alliance diary trenton", "Alliance Dairy - Trenton"],
  ["barnes hay farms", "Barnes Hay Farms INC"],
  ["black gold", "Black Gold Farms"],
  ["lee peanut farm llc", "Lee Peanut Farms LLC"],
  ["lee peanut farms", "Lee Peanut Farms LLC"],
  ["nkc southeast", "NKC Southeast LLC"],
  ["alliance grazing group", "Alliance Dairy Grazing Group"],
]);

function canonicalCustomerName(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return trimmed;
  return CUSTOMER_ALIASES.get(trimmed.toLowerCase()) || trimmed;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  const src = String(text || "").replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === "," || ch === "\t") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function normalizeHeader(value) {
  return String(value || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function parseNumber(value) {
  const cleaned = String(value || "")
    .replace(/[$,]/g, "")
    .trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function contactFromNotes(notes) {
  const text = String(notes || "").trim();
  if (!text) return null;
  const parts = text
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
  const candidate = parts[parts.length - 1];
  if (!candidate) return null;
  // Skip pure codes / short tokens that are not people or farm businesses.
  if (!/[a-zA-Z]{2,}/.test(candidate)) return null;
  if (!/\s/.test(candidate) && !/(llc|inc|bros|brothers|farms|dairy|sod|co\.?)$/i.test(candidate)) {
    return null;
  }
  // Skip notes that are clearly pivot aliases, not contacts.
  if (/^(was |woodlands|copeland|scaffold|pivot |well |dp\d|fpi |nkc |canamera|eternity|scaff )/i.test(candidate)) {
    return null;
  }
  return candidate.slice(0, 120);
}

function locationNoteFrom(notes, contactName) {
  const text = String(notes || "").trim();
  if (!text) return null;
  if (contactName && text === contactName) return null;
  if (contactName && text.endsWith(`; ${contactName}`)) {
    const left = text.slice(0, text.length - contactName.length - 2).trim();
    return left || null;
  }
  return text.slice(0, 400);
}

function isAmericanIrrigationOrg(org) {
  return /americus|american irrigation|heartland|demo-irrigation/i.test(`${org.name} ${org.slug}`);
}

function readRows() {
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`Missing ${CSV_PATH}`);
  }
  const table = parseCsv(fs.readFileSync(CSV_PATH, "utf8"));
  if (table.length < 2) return [];
  const headers = table[0].map(normalizeHeader);
  const idx = {
    customer: headers.indexOf("customer"),
    pivotName: headers.indexOf("pivot name"),
    latitude: headers.indexOf("latitude"),
    longitude: headers.indexOf("longitude"),
    notes: headers.findIndex((header) => header.includes("other names") || header === "notes"),
  };
  if (idx.customer < 0 || idx.pivotName < 0 || idx.latitude < 0 || idx.longitude < 0) {
    throw new Error("CSV needs Customer, Pivot Name, Latitude, Longitude columns.");
  }

  const rows = [];
  for (const cells of table.slice(1)) {
    const rawCustomer = canonicalCustomerName(String(cells[idx.customer] || "").trim());
    // Blank customer cells (merged spreadsheet) go to Unassigned — do not fill forward.
    const customer = rawCustomer || UNASSIGNED_NAME;
    const farmName = rawCustomer ? rawCustomer : UNASSIGNED_NAME;
    const name = String(cells[idx.pivotName] || "").trim();
    const latitude = parseNumber(cells[idx.latitude] || "");
    const longitude = parseNumber(cells[idx.longitude] || "");
    const notes = idx.notes >= 0 ? String(cells[idx.notes] || "").trim() : "";
    if (!name || latitude == null || longitude == null) continue;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) continue;
    const contactName = contactFromNotes(notes);
    rows.push({
      customer,
      farmName,
      blankCustomer: !rawCustomer,
      name,
      latitude,
      longitude,
      contactName,
      locationNote: locationNoteFrom(notes, contactName),
    });
  }
  return rows;
}

async function ensureLiveOakStore(organizationId) {
  const existing = await prisma.store.findFirst({
    where: { organizationId, name: { equals: STORE_NAME } },
  });
  if (existing) return existing;
  return prisma.store.create({
    data: { organizationId, name: STORE_NAME },
  });
}

async function loadFarmerCache(organizationId) {
  const farmers = await prisma.farmer.findMany({ where: { organizationId } });
  const cache = new Map();
  for (const farmer of farmers) {
    cache.set(farmer.name.trim().toLowerCase(), { farmer, created: false, farm: null });
  }
  return cache;
}

async function ensureFarmer(organizationId, storeId, customerName, cache) {
  const key = customerName.toLowerCase();
  if (cache.has(key)) {
    const entry = cache.get(key);
    if (entry.farmer.storeId !== storeId) {
      entry.farmer = await prisma.farmer.update({
        where: { id: entry.farmer.id },
        data: { storeId },
      });
    }
    return entry;
  }

  const farmer = await prisma.farmer.create({
    data: {
      organizationId,
      storeId,
      name: customerName,
      contacts: { create: { name: customerName } },
    },
  });
  const entry = { farmer, created: true, farm: null };
  cache.set(key, entry);
  return entry;
}

async function ensureFarm(organizationId, entry, farmName) {
  const key = `farm:${farmName.toLowerCase()}`;
  if (entry[key]) return { farm: entry[key], created: false };
  let farm = await prisma.farm.findFirst({
    where: { organizationId, farmerId: entry.farmer.id, name: farmName },
  });
  let created = false;
  if (!farm) {
    farm = await prisma.farm.create({
      data: {
        organizationId,
        farmerId: entry.farmer.id,
        name: farmName,
        assignments: {
          create: {
            farmerId: entry.farmer.id,
            startYear: new Date().getFullYear(),
          },
        },
      },
    });
    created = true;
  }
  entry[key] = farm;
  // Keep default farm pointer for the common one-farm-per-customer path.
  if (!entry.farm) entry.farm = farm;
  return { farm, created };
}

async function ensureContact(farmerId, contactName) {
  if (!contactName) return { created: false };
  const existing = await prisma.farmerContact.findFirst({
    where: { farmerId, name: { equals: contactName } },
  });
  if (existing) return { created: false };
  await prisma.farmerContact.create({
    data: { farmerId, name: contactName },
  });
  return { created: true };
}

async function upsertPivot(organizationId, farmerId, farmId, row) {
  // Match on this customer first; otherwise same pin elsewhere in the org (fixes earlier fill-forward).
  let existing = await prisma.pivot.findFirst({
    where: { organizationId, farmerId, name: row.name },
  });
  if (!existing) {
    existing = await prisma.pivot.findFirst({
      where: {
        organizationId,
        name: row.name,
        latitude: row.latitude,
        longitude: row.longitude,
      },
    });
  }
  const data = {
    farmerId,
    farmId,
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude,
    locationNote: row.locationNote,
  };
  if (existing) {
    await prisma.pivot.update({ where: { id: existing.id }, data });
    return existing.farmerId === farmerId && existing.farmId === farmId ? "updated" : "moved";
  }
  await prisma.pivot.create({
    data: { organizationId, ...data },
  });
  return "created";
}

async function main() {
  const rows = readRows();
  if (!rows.length) {
    console.log("Live Oak import: no pivot rows found.");
    return;
  }

  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, slug: true },
  });
  const org = orgs.find(isAmericanIrrigationOrg);
  if (!org) {
    console.log("Live Oak import: American Irrigation organization not found; skipped.");
    return;
  }

  const store = await ensureLiveOakStore(org.id);
  const farmerCache = await loadFarmerCache(org.id);
  const stats = {
    customersCreated: 0,
    farmsCreated: 0,
    contactsCreated: 0,
    pivotsCreated: 0,
    pivotsUpdated: 0,
    pivotsMoved: 0,
    blankCustomerRows: 0,
    skipped: 0,
  };

  for (const row of rows) {
    try {
      if (row.blankCustomer) stats.blankCustomerRows += 1;
      const entry = await ensureFarmer(org.id, store.id, row.customer, farmerCache);
      if (entry.created) {
        stats.customersCreated += 1;
        entry.created = false;
      }
      const farmResult = await ensureFarm(org.id, entry, row.farmName);
      if (farmResult.created) stats.farmsCreated += 1;

      const contact = await ensureContact(entry.farmer.id, row.contactName);
      if (contact.created) stats.contactsCreated += 1;

      const result = await upsertPivot(org.id, entry.farmer.id, farmResult.farm.id, row);
      if (result === "created") stats.pivotsCreated += 1;
      else if (result === "moved") stats.pivotsMoved += 1;
      else stats.pivotsUpdated += 1;
    } catch (error) {
      stats.skipped += 1;
      console.error(`Live Oak import row failed (${row.customer} / ${row.name}):`, error.message || error);
    }
  }

  console.log(
    `Live Oak import on ${org.name}: store=${store.name}; customers+${stats.customersCreated}; farms+${stats.farmsCreated}; contacts+${stats.contactsCreated}; pivots+${stats.pivotsCreated}/upd ${stats.pivotsUpdated}/moved ${stats.pivotsMoved}; blankCustomerRows=${stats.blankCustomerRows}; skipped=${stats.skipped}; rows=${rows.length}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
