/**
 * Import UNADILLA JOB LOG W/O history (last ~6 months CSV) into Unadilla:
 * - create missing pivots from SITE + LOCATION (Maps URL / lat-lng)
 * - create work orders assigned to Unadilla
 * - mark rows with an invoice # as COMPLETED
 *
 * CSV: data/unadilla-wo-6mo.csv
 * Columns: date,customer,site,work,order_number,google_location,est_number,tech,bom,invoice_number
 */
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const CSV_PATH = path.join(__dirname, "..", "data", "unadilla-wo-6mo.csv");
const STORE_NAME = "Unadilla";
const DEFAULT_COORDS = { latitude: 32.2596, longitude: -83.7366 };
const MAPS_CACHE = new Map();

function isAmericanIrrigationOrg(org) {
  return /americus|american irrigation|heartland|demo-irrigation/i.test(`${org.name} ${org.slug}`);
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
        } else inQuotes = false;
      } else cell += ch;
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
    } else if (ch !== "\r") cell += ch;
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function parseMapsLocation(raw) {
  const text = String(raw || "").trim();
  const at = text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) return { latitude: Number(at[1]), longitude: Number(at[2]) };
  const q = text.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (q) return { latitude: Number(q[1]), longitude: Number(q[2]) };
  const search = text.match(/\/search\/(-?\d+\.\d+)\s*,\s*\+?(-?\d+\.\d+)/);
  if (search) return { latitude: Number(search[1]), longitude: Number(search[2]) };
  const ll = text.match(/[?&](?:ll|center)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (ll) return { latitude: Number(ll[1]), longitude: Number(ll[2]) };
  const bang = text.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (bang) return { latitude: Number(bang[1]), longitude: Number(bang[2]) };
  const pair = text.match(/^(-?\d+\.\d+)\s*,\s*\+?(-?\d+\.\d+)$/);
  if (pair) return { latitude: Number(pair[1]), longitude: Number(pair[2]) };
  return null;
}

async function resolveMapsUrl(url) {
  const key = String(url || "").trim();
  if (!key) return null;
  if (MAPS_CACHE.has(key)) return MAPS_CACHE.get(key);
  let coords = parseMapsLocation(key);
  if (!coords && /maps\.app\.goo\.gl|goo\.gl\/maps|maps\.google\.com/i.test(key)) {
    try {
      const response = await fetch(key, { redirect: "manual" });
      const location = response.headers.get("location") || "";
      coords = parseMapsLocation(location);
      if (!coords && location) {
        const second = await fetch(location, { redirect: "manual" });
        coords = parseMapsLocation(second.headers.get("location") || "") || parseMapsLocation(location);
      }
    } catch {
      coords = null;
    }
  }
  MAPS_CACHE.set(key, coords);
  return coords;
}

function readRows() {
  if (!fs.existsSync(CSV_PATH)) throw new Error(`Missing ${CSV_PATH}`);
  const table = parseCsv(fs.readFileSync(CSV_PATH, "utf8"));
  if (table.length < 2) return [];
  const headers = table[0].map((h) => h.trim().toLowerCase());
  const idx = Object.fromEntries(headers.map((h, i) => [h, i]));
  const rows = [];
  for (const cells of table.slice(1)) {
    const get = (name) => String(cells[idx[name]] || "").trim();
    const customer = get("customer");
    if (!customer) continue;
    const invoice = get("invoice_number");
    if (/^void$/i.test(invoice)) continue;
    rows.push({
      date: get("date"),
      customer,
      site: get("site"),
      work: get("work"),
      orderNumber: get("order_number"),
      googleLocation: get("google_location"),
      estNumber: get("est_number"),
      tech: get("tech"),
      bom: get("bom"),
      invoiceNumber: invoice && !/^void$/i.test(invoice) ? invoice : "",
    });
  }
  return rows;
}

async function ensureUnadillaStore(organizationId) {
  const existing = await prisma.store.findFirst({
    where: { organizationId, name: { equals: STORE_NAME } },
  });
  if (existing) return existing;
  return prisma.store.create({ data: { organizationId, name: STORE_NAME } });
}

async function loadFarmerCache(organizationId) {
  const farmers = await prisma.farmer.findMany({ where: { organizationId } });
  const cache = new Map();
  for (const farmer of farmers) {
    cache.set(farmer.name.trim().toLowerCase(), farmer);
  }
  return cache;
}

async function ensureFarmer(organizationId, storeId, name, cache) {
  const key = name.toLowerCase();
  let farmer = cache.get(key);
  if (farmer) {
    if (farmer.storeId !== storeId) {
      farmer = await prisma.farmer.update({
        where: { id: farmer.id },
        data: { storeId },
      });
      cache.set(key, farmer);
    }
    return { farmer, created: false };
  }
  farmer = await prisma.farmer.create({
    data: {
      organizationId,
      storeId,
      name,
      contacts: { create: { name } },
    },
  });
  cache.set(key, farmer);
  return { farmer, created: true };
}

async function ensureFarm(organizationId, farmer) {
  const farmName = farmer.name;
  let farm = await prisma.farm.findFirst({
    where: { organizationId, farmerId: farmer.id, name: farmName },
  });
  if (farm) return { farm, created: false };
  farm = await prisma.farm.create({
    data: {
      organizationId,
      farmerId: farmer.id,
      name: farmName,
      assignments: { create: { farmerId: farmer.id, startYear: new Date().getFullYear() } },
    },
  });
  return { farm, created: true };
}

async function findExistingPivot(organizationId, farmer, siteName, googleLocation) {
  if (googleLocation) {
    const byNote = await prisma.pivot.findFirst({
      where: { organizationId, farmerId: farmer.id, locationNote: googleLocation },
    });
    if (byNote) return byNote;
  }
  if (siteName) {
    return prisma.pivot.findFirst({
      where: { organizationId, farmerId: farmer.id, name: siteName },
    });
  }
  return null;
}

async function ensurePivotFromLocation(organizationId, farmer, farm, row) {
  const siteName = row.site || (row.orderNumber ? `Order ${row.orderNumber}` : `Call ${row.date}`);
  const location = row.googleLocation || "";

  let pivot = await findExistingPivot(organizationId, farmer, siteName, location);
  if (pivot) {
    if (location && (!pivot.locationNote || !parseMapsLocation(pivot.locationNote || ""))) {
      const coords = (await resolveMapsUrl(location)) || null;
      if (coords) {
        pivot = await prisma.pivot.update({
          where: { id: pivot.id },
          data: {
            latitude: coords.latitude,
            longitude: coords.longitude,
            locationNote: location,
          },
        });
      }
    }
    return { pivot, created: false };
  }

  // Only create new pivots when LOCATION column has a pin (per import request).
  if (!location) return { pivot: null, created: false };

  const coords = (await resolveMapsUrl(location)) || DEFAULT_COORDS;
  pivot = await prisma.pivot.create({
    data: {
      organizationId,
      farmerId: farmer.id,
      farmId: farm.id,
      name: siteName,
      latitude: coords.latitude,
      longitude: coords.longitude,
      locationNote: location,
    },
  });
  return { pivot, created: true };
}

function ticketMarker(row) {
  if (row.invoiceNumber) return `Unadilla invoice ${row.invoiceNumber}`;
  if (row.orderNumber) return `Unadilla order #${row.orderNumber}`;
  return `Unadilla ${row.date} ${row.customer} ${row.site}`.slice(0, 120);
}

function buildTitle(row) {
  const site = row.site || "site";
  const work = row.work || "Service";
  const title = `${site}: ${work}`;
  return title.length > 140 ? `${title.slice(0, 137)}...` : title;
}

function buildDescription(row) {
  return [
    row.work || "Imported from Unadilla JOB LOG workbook.",
    row.site ? `Site: ${row.site}` : "",
    row.orderNumber ? `Service order #: ${row.orderNumber}` : "",
    row.estNumber ? `Est. #: ${row.estNumber}` : "",
    row.tech ? `Tech: ${row.tech}` : "",
    row.bom ? `BOM #: ${row.bom}` : "",
    row.googleLocation ? `Location: ${row.googleLocation}` : "",
    ticketMarker(row),
  ]
    .filter(Boolean)
    .join("\n");
}

async function nextTicketNumber(organizationId) {
  const last = await prisma.ticket.aggregate({
    where: { organizationId },
    _max: { number: true },
  });
  return (last._max.number ?? 1000) + 1;
}

async function upsertTicket(organizationId, storeId, userId, farmer, pivot, row) {
  const marker = ticketMarker(row);
  let existing = null;
  if (row.invoiceNumber) {
    existing = await prisma.ticket.findFirst({
      where: { organizationId, invoiceNumber: row.invoiceNumber },
    });
  }
  if (!existing) {
    existing = await prisma.ticket.findFirst({
      where: {
        organizationId,
        farmerId: farmer.id,
        description: { contains: marker },
      },
    });
  }

  const when = new Date(`${row.date}T12:00:00`);
  const closed = Boolean(row.invoiceNumber);
  const data = {
    farmerId: farmer.id,
    pivotId: pivot?.id ?? null,
    storeId,
    title: buildTitle(row),
    description: buildDescription(row),
    status: closed ? "COMPLETED" : "OPEN",
    priority: "NORMAL",
    invoiceNumber: row.invoiceNumber || null,
    invoiceAmount: closed ? 0 : null,
    scheduledAt: when,
    closedAt: closed ? when : null,
    createdAt: when,
  };

  if (existing) {
    await prisma.ticket.update({
      where: { id: existing.id },
      data,
    });
    return "updated";
  }

  const number = await nextTicketNumber(organizationId);
  await prisma.ticket.create({
    data: {
      organizationId,
      number,
      ...data,
      updates: {
        create: {
          userId,
          message: `Imported from Unadilla JOB LOG · ${marker}`,
          status: data.status,
        },
      },
    },
  });
  return "created";
}

async function main() {
  const rows = readRows();
  if (!rows.length) {
    console.log("Unadilla WO import: no rows in CSV.");
    return;
  }

  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, slug: true },
  });
  const org = orgs.find(isAmericanIrrigationOrg);
  if (!org) {
    console.log("Unadilla WO import: American Irrigation organization not found; skipped.");
    return;
  }

  const store = await ensureUnadillaStore(org.id);
  const admin =
    (await prisma.user.findFirst({
      where: { organizationId: org.id, role: "ADMIN" },
      select: { id: true },
    })) ||
    (await prisma.user.findFirst({
      where: { organizationId: org.id },
      select: { id: true },
    }));
  if (!admin) throw new Error("No staff user to attach ticket updates.");

  const farmerCache = await loadFarmerCache(org.id);
  const stats = {
    customersCreated: 0,
    farmsCreated: 0,
    pivotsCreated: 0,
    ticketsCreated: 0,
    ticketsUpdated: 0,
    ticketsClosed: 0,
    skipped: 0,
  };

  const uniqueLinks = [...new Set(rows.map((row) => row.googleLocation).filter(Boolean))];
  console.log(`Unadilla WO import: resolving ${uniqueLinks.length} LOCATION pins...`);
  const concurrency = 8;
  for (let i = 0; i < uniqueLinks.length; i += concurrency) {
    await Promise.all(uniqueLinks.slice(i, i + concurrency).map((url) => resolveMapsUrl(url)));
  }

  for (const row of rows) {
    try {
      const farmerResult = await ensureFarmer(org.id, store.id, row.customer, farmerCache);
      if (farmerResult.created) stats.customersCreated += 1;
      const farmResult = await ensureFarm(org.id, farmerResult.farmer);
      if (farmResult.created) stats.farmsCreated += 1;

      let pivot = null;
      if (row.googleLocation || row.site) {
        const pivotResult = await ensurePivotFromLocation(
          org.id,
          farmerResult.farmer,
          farmResult.farm,
          row,
        );
        if (pivotResult.created) stats.pivotsCreated += 1;
        pivot = pivotResult.pivot;
        if (!pivot && row.site) {
          pivot = await findExistingPivot(org.id, farmerResult.farmer, row.site, "");
        }
      }

      const result = await upsertTicket(org.id, store.id, admin.id, farmerResult.farmer, pivot, row);
      if (result === "created") stats.ticketsCreated += 1;
      else stats.ticketsUpdated += 1;
      if (row.invoiceNumber) stats.ticketsClosed += 1;
    } catch (error) {
      stats.skipped += 1;
      console.error(`Unadilla WO row failed (${row.date} ${row.customer}):`, error.message || error);
    }
  }

  console.log(
    `Unadilla WO import on ${org.name}/${store.name}: customers+${stats.customersCreated}; farms+${stats.farmsCreated}; pivots+${stats.pivotsCreated}; tickets+${stats.ticketsCreated}/upd ${stats.ticketsUpdated}; closed=${stats.ticketsClosed}; skipped=${stats.skipped}; rows=${rows.length}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
