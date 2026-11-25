/**
 * Import RBIA W/O history (last ~6 months CSV) into American Irrigation / Americus:
 * - create missing pivots from SITE names using Maps links in JOB LOCATION (column F)
 * - create work orders assigned to Americus
 * - mark rows with an invoice # as COMPLETED
 *
 * CSV: data/rbia-wo-6mo.csv
 * Columns: date,customer,site,work,order_number,job_location,est_number,tech,invoice_number
 */
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const CSV_PATH = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, "..", "data", "rbia-wo-6mo.csv");
const STORE_NAME = "Americus";
const DEFAULT_COORDS = { latitude: 32.0724, longitude: -84.2327 };
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
  if (!coords && /maps\.app\.goo\.gl|goo\.gl\/maps/i.test(key)) {
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
      jobLocation: get("job_location"),
      estNumber: get("est_number"),
      tech: get("tech"),
      invoiceNumber: invoice && !/^void$/i.test(invoice) ? invoice : "",
    });
  }
  return rows;
}

async function ensureAmericusStore(organizationId) {
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

async function ensurePivot(organizationId, farmer, farm, siteName, jobLocation) {
  const name = siteName || "Unnamed site";
  let pivot = await prisma.pivot.findFirst({
    where: { organizationId, farmerId: farmer.id, name },
  });
  if (pivot) {
    // Backfill coords from Maps link when the existing pin has default/missing precision.
    if (jobLocation && (!pivot.locationNote || !/maps\.|goo\.gl/i.test(pivot.locationNote))) {
      const coords = (await resolveMapsUrl(jobLocation)) || null;
      if (coords) {
        pivot = await prisma.pivot.update({
          where: { id: pivot.id },
          data: {
            latitude: coords.latitude,
            longitude: coords.longitude,
            locationNote: jobLocation,
          },
        });
      }
    }
    return { pivot, created: false };
  }
  const coords = (await resolveMapsUrl(jobLocation)) || DEFAULT_COORDS;
  pivot = await prisma.pivot.create({
    data: {
      organizationId,
      farmerId: farmer.id,
      farmId: farm.id,
      name,
      latitude: coords.latitude,
      longitude: coords.longitude,
      locationNote: jobLocation || null,
    },
  });
  return { pivot, created: true };
}

function ticketMarker(row) {
  if (row.invoiceNumber) return `RBIA invoice ${row.invoiceNumber}`;
  if (row.orderNumber) return `RBIA order #${row.orderNumber}`;
  return `RBIA ${row.date} ${row.customer} ${row.site}`.slice(0, 120);
}

function buildTitle(row) {
  const site = row.site || "site";
  const work = row.work || "Service";
  const title = `${site}: ${work}`;
  return title.length > 140 ? `${title.slice(0, 137)}...` : title;
}

function buildDescription(row) {
  return [
    row.work || "Imported from RBIA W/O workbook.",
    row.site ? `Site: ${row.site}` : "",
    row.orderNumber ? `Order #: ${row.orderNumber}` : "",
    row.estNumber ? `Est. #: ${row.estNumber}` : "",
    row.tech ? `Tech: ${row.tech}` : "",
    row.jobLocation ? `Location: ${row.jobLocation}` : "",
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
          message: `Imported from RBIA W/O · ${marker}`,
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
    console.log("RBIA import: no rows in CSV.");
    return;
  }

  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, slug: true },
  });
  const org = orgs.find(isAmericanIrrigationOrg);
  if (!org) {
    console.log("RBIA import: American Irrigation organization not found; skipped.");
    return;
  }

  const store = await ensureAmericusStore(org.id);
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

  // Resolve unique maps links first (bounded concurrency).
  const uniqueLinks = [...new Set(rows.map((row) => row.jobLocation).filter(Boolean))];
  console.log(`RBIA import: resolving ${uniqueLinks.length} Maps links...`);
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
      if (row.site || row.jobLocation) {
        const pivotResult = await ensurePivot(
          org.id,
          farmerResult.farmer,
          farmResult.farm,
          row.site || `Order ${row.orderNumber || row.date}`,
          row.jobLocation,
        );
        if (pivotResult.created) stats.pivotsCreated += 1;
        pivot = pivotResult.pivot;
      }

      const result = await upsertTicket(org.id, store.id, admin.id, farmerResult.farmer, pivot, row);
      if (result === "created") stats.ticketsCreated += 1;
      else stats.ticketsUpdated += 1;
      if (row.invoiceNumber) stats.ticketsClosed += 1;
    } catch (error) {
      stats.skipped += 1;
      console.error(`RBIA row failed (${row.date} ${row.customer}):`, error.message || error);
    }
  }

  console.log(
    `RBIA import on ${org.name}/${store.name}: customers+${stats.customersCreated}; farms+${stats.farmsCreated}; pivots+${stats.pivotsCreated}; tickets+${stats.ticketsCreated}/upd ${stats.ticketsUpdated}; closed=${stats.ticketsClosed}; skipped=${stats.skipped}; rows=${rows.length}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
