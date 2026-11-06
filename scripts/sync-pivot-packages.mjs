import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const packages = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "pivot-packages.json"), "utf8"));

const WEAK = new Set(["bigpivot", "housepivot", "mainfarm", "newpivots", "shopfarm", "swamppivot", "well"]);

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function hasWord(hay, token) {
  return new RegExp(`(?:^|[^a-z0-9])${token.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}(?:[^a-z0-9]|$)`).test(hay);
}

function facts(description) {
  const brand =
    [/valley/i, "Valley"]
      .concat([])
      .length && /valley/i.test(description)
      ? "Valley"
      : /zimmatic/i.test(description)
        ? "Zimmatic"
        : /reinke/i.test(description)
          ? "Reinke"
          : /lindsay/i.test(description)
            ? "Lindsay"
            : /pierce/i.test(description)
              ? "Pierce"
              : /\bt-?l\b/i.test(description)
                ? "T-L"
                : /olson/i.test(description)
                  ? "Olson"
                  : "";
  const towerCount = description.match(/\b(\d+)\s*-?\s*towers?\b/i)?.[1] ?? "";
  const lengthFeet =
    description.match(/(\d+(?:\.\d+)?)\s*(?:'|ft|feet)\b/i)?.[1] ??
    description.match(/pivot\s*[-–]?\s*(\d+(?:\.\d+)?)/i)?.[1] ??
    "";
  return { brand, towerCount, lengthFeet };
}

function collapse(hits) {
  if (hits.length <= 1) return hits;
  const preferred = hits.filter((pkg) => /sprinkler\s+package/i.test(pkg.description));
  const pool = preferred.length ? preferred : hits;
  const byKey = new Map();
  for (const pkg of pool) {
    const key = normalize(pkg.description.replace(/sprinkler\s+package\s+for/gi, " "));
    if (!byKey.has(key)) byKey.set(key, pkg);
  }
  return [...byKey.values()];
}

const byId = new Map();
const rows = packages.map((pkg) => {
  for (const raw of [pkg.item, pkg.mpn, pkg.barcode, pkg.reference]) {
    const id = normalize(raw);
    if (id.length < 3) continue;
    const list = byId.get(id) ?? [];
    list.push(pkg);
    byId.set(id, list);
  }
  return { pkg, norm: normalize(pkg.description), hay: pkg.description.toLowerCase() };
});

function matchPivot(pivot) {
  const serial = normalize(pivot.serialNumber);
  if (serial.length >= 3) {
    const hits = collapse(byId.get(serial) ?? []);
    if (hits.length === 1) return hits[0];
  }
  const trimmed = String(pivot.name ?? "").trim();
  if (!trimmed || /^\d+(?:\.\d+)?$/.test(trimmed)) return null;
  const nameNorm = normalize(trimmed);
  if (nameNorm.length < 4 || WEAK.has(nameNorm) || !/[a-z]/.test(nameNorm)) return null;
  let hits = collapse(rows.filter((row) => row.norm.includes(nameNorm)).map((row) => row.pkg));
  if (hits.length > 1) {
    const nums = [...trimmed.matchAll(/\d+/g)].map((m) => m[0]);
    if (nums.length) {
      hits = collapse(hits.filter((pkg) => nums.every((n) => hasWord(pkg.description.toLowerCase(), n))));
    }
  }
  return hits.length === 1 ? hits[0] : null;
}

const orgs = await prisma.organization.findMany({ select: { id: true, name: true } });
for (const org of orgs) {
  const pivots = await prisma.pivot.findMany({
    where: { organizationId: org.id },
    select: { id: true, name: true, serialNumber: true, packageItem: true },
  });
  let matched = 0;
  let updated = 0;
  for (const pivot of pivots) {
    const pkg = matchPivot(pivot);
    if (!pkg) continue;
    matched += 1;
    if (pivot.packageItem) continue;
    const info = facts(pkg.description);
    await prisma.pivot.update({
      where: { id: pivot.id },
      data: {
        packageItem: pkg.item,
        packageDescription: pkg.description,
        packageBrand: info.brand || null,
        packageTowerCount: info.towerCount ? Number(info.towerCount) : null,
        packageLengthFeet: info.lengthFeet || null,
        packageVendor: pkg.vendor || null,
        packageMatchedAt: new Date(),
      },
    });
    updated += 1;
  }
  console.log(`${org.name}: scanned ${pivots.length}, matched ${matched}, updated ${updated}`);
}

await prisma.$disconnect();
