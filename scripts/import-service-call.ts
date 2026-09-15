import { readFileSync, writeFileSync, existsSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { parseCsv } from "../lib/csv";
import { parseMapsLocation } from "../lib/maps";

const SOURCE = "tmp-import.csv";
const CACHE = "tmp-maps-cache.json";
const OUT_CSV = "tmp-service-call-pivots.csv";
const ORG_SLUG = process.env.IMPORT_ORG_SLUG || "heartland-irrigation";

const prisma = new PrismaClient();

function farmName(customer: string) {
  return customer.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").replace(/[.,]+$/g, "").trim();
}

function farmPhone(customer: string) {
  const match = customer.match(/(\d{3})[-.\s]?(\d{3})[-.\s]?(\d{4})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

async function resolveMapsLink(url: string) {
  const direct = parseMapsLocation(url);
  if (direct) return direct;
  const response = await fetch(url, {
    redirect: "manual",
    headers: { "User-Agent": "Mozilla/5.0 AG-Service-Desk-Import" },
  });
  const location = response.headers.get("location") || "";
  return parseMapsLocation(location) ?? parseMapsLocation(decodeURIComponent(location));
}

async function main() {
  const rows = parseCsv(readFileSync(SOURCE, "utf8"));
  const cache: Record<string, { latitude: number; longitude: number }> = existsSync(CACHE)
    ? JSON.parse(readFileSync(CACHE, "utf8"))
    : {};

  const uniqueUrls = [...new Set(rows.slice(1).map((row) => (row[2] ?? "").trim()).filter(Boolean))];
  for (let i = 0; i < uniqueUrls.length; i += 8) {
    const batch = uniqueUrls.slice(i, i + 8).filter((url) => !cache[url]);
    await Promise.all(
      batch.map(async (url) => {
        try {
          const coords = await resolveMapsLink(url);
          if (coords) cache[url] = coords;
          else console.error("No coords", url);
        } catch (error) {
          console.error("Resolve failed", url, error);
        }
      }),
    );
    writeFileSync(CACHE, JSON.stringify(cache));
    console.error(`resolved ${Math.min(i + 8, uniqueUrls.length)}/${uniqueUrls.length}`);
  }

  const data: {
    customer: string;
    farm: string;
    site: string;
    url: string;
    latitude: number;
    longitude: number;
    phone: string | null;
  }[] = [];

  let failed = 0;
  for (const row of rows.slice(1)) {
    const customer = (row[0] ?? "").trim();
    const siteRaw = (row[1] ?? "").trim();
    const url = (row[2] ?? "").trim();
    if (!customer || !url || !cache[url]) {
      failed += 1;
      continue;
    }
    const site = !siteRaw || /^\(no site recorded\)$/i.test(siteRaw) ? farmName(customer) : siteRaw;
    data.push({
      customer,
      farm: farmName(customer),
      site,
      url,
      latitude: cache[url].latitude,
      longitude: cache[url].longitude,
      phone: farmPhone(customer),
    });
  }

  const csv = [
    "Device Name,Grower,Latitude,Longitude,Location Note",
    ...data.map((row) =>
      [row.site, row.farm, row.latitude, row.longitude, row.url]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    ),
  ].join("\n");
  writeFileSync(OUT_CSV, csv);

  const org = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  if (!org) throw new Error(`Organization ${ORG_SLUG} not found`);

  const existingFarms = await prisma.farmer.findMany({ where: { organizationId: org.id } });
  const farmByName = new Map(existingFarms.map((farm) => [farm.name.trim().toLowerCase(), farm]));

  let farmsCreated = 0;
  let pivotsCreated = 0;
  let pivotsUpdated = 0;

  for (const row of data) {
    let farm = farmByName.get(row.farm.toLowerCase());
    if (!farm) {
      farm = await prisma.farmer.create({
        data: {
          organizationId: org.id,
          name: row.farm,
          phone: row.phone,
          contacts: {
            create: { name: row.farm, phone: row.phone },
          },
        },
      });
      farmByName.set(row.farm.toLowerCase(), farm);
      farmsCreated += 1;
    } else if (row.phone) {
      const contacts = await prisma.farmerContact.count({ where: { farmerId: farm.id } });
      if (contacts === 0) {
        await prisma.farmerContact.create({
          data: { farmerId: farm.id, name: row.farm, phone: row.phone },
        });
      }
    }

    const existing = await prisma.pivot.findFirst({
      where: { organizationId: org.id, farmerId: farm.id, name: row.site },
    });
    const payload = {
      farmerId: farm.id,
      name: row.site,
      latitude: row.latitude,
      longitude: row.longitude,
      locationNote: row.url,
    };
    if (existing) {
      await prisma.pivot.update({ where: { id: existing.id }, data: payload });
      pivotsUpdated += 1;
    } else {
      await prisma.pivot.create({
        data: { organizationId: org.id, ...payload },
      });
      pivotsCreated += 1;
    }
  }

  console.log(
    JSON.stringify(
      { rows: data.length, failed, farmsCreated, pivotsCreated, pivotsUpdated, csv: OUT_CSV },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
