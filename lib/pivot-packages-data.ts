import { readFile } from "fs/promises";
import path from "path";
import type { PivotPackage } from "./pivot-packages";
import { prisma } from "./prisma";

let cached: PivotPackage[] | null = null;

export const PACKAGE_KINDS = {
  PIVOT: "PIVOT",
  SPRINKLER: "SPRINKLER",
} as const;

export type PackageKind = (typeof PACKAGE_KINDS)[keyof typeof PACKAGE_KINDS];

function asMoney(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
}

function asText(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function normalizeItem(item: string) {
  return item.trim().toLowerCase();
}

async function loadBasePackages(): Promise<PivotPackage[]> {
  if (cached) return cached;
  const filePath = path.join(process.cwd(), "data", "pivot-packages.json");
  const raw = JSON.parse(await readFile(filePath, "utf8")) as unknown;
  if (!Array.isArray(raw)) {
    cached = [];
    return cached;
  }
  cached = raw
    .map((row) => {
      const record = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
      return {
        item: asText(record.item).trim(),
        description: asText(record.description).trim(),
        purchaseDescription: asText(record.purchaseDescription).trim(),
        qty: asText(record.qty).trim(),
        uom: asText(record.uom).trim(),
        cost: asMoney(record.cost),
        price: asMoney(record.price),
        vendor: asText(record.vendor).trim(),
        mpn: asText(record.mpn).trim(),
        barcode: asText(record.barcode).trim(),
        reference: asText(record.reference).trim(),
      };
    })
    .filter((pkg) => pkg.item);
  return cached;
}

function rowToPackage(row: {
  item: string;
  description: string;
  purchaseDescription: string;
  qty: string;
  uom: string;
  cost: number;
  price: number;
  vendor: string;
  mpn: string;
  barcode: string;
  reference: string;
}): PivotPackage {
  return {
    item: row.item.trim(),
    description: row.description.trim(),
    purchaseDescription: row.purchaseDescription.trim(),
    qty: row.qty.trim(),
    uom: row.uom.trim(),
    cost: asMoney(row.cost),
    price: asMoney(row.price),
    vendor: row.vendor.trim(),
    mpn: row.mpn.trim(),
    barcode: row.barcode.trim(),
    reference: row.reference.trim(),
  };
}

export async function loadPivotPackages(organizationId?: string | null): Promise<PivotPackage[]> {
  const base = await loadBasePackages();
  if (!organizationId) return base;

  const custom = await prisma.salesPackage.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
  });
  if (!custom.length) return base;

  const byItem = new Map(base.map((pkg) => [normalizeItem(pkg.item), pkg]));
  for (const row of custom) {
    const pkg = rowToPackage(row);
    if (!pkg.item) continue;
    byItem.set(normalizeItem(pkg.item), pkg);
  }
  return [...byItem.values()];
}

export async function createSalesPackage(input: {
  organizationId: string;
  kind: PackageKind;
  item: string;
  description: string;
  purchaseDescription?: string;
  qty?: string;
  uom?: string;
  cost?: number;
  price?: number;
  vendor?: string;
  mpn?: string;
  barcode?: string;
  reference?: string;
}) {
  const item = input.item.trim();
  const description = input.description.trim();
  if (!item) throw new Error("Item number is required.");
  if (!description) throw new Error("Description is required.");
  if (input.kind !== PACKAGE_KINDS.PIVOT && input.kind !== PACKAGE_KINDS.SPRINKLER) {
    throw new Error("Choose pivot or sprinkler package.");
  }

  const existing = await prisma.salesPackage.findUnique({
    where: {
      organizationId_item: { organizationId: input.organizationId, item },
    },
    select: { id: true },
  });
  if (existing) throw new Error("A package with that item number already exists.");

  const base = await loadBasePackages();
  if (base.some((pkg) => normalizeItem(pkg.item) === normalizeItem(item))) {
    throw new Error("That item number is already in the shared package catalog.");
  }

  const mpn = (input.mpn ?? "").trim() || item;
  const barcode = (input.barcode ?? "").trim() || item;

  return prisma.salesPackage.create({
    data: {
      organizationId: input.organizationId,
      kind: input.kind,
      item,
      description,
      purchaseDescription: (input.purchaseDescription ?? "").trim(),
      qty: (input.qty ?? "0").trim() || "0",
      uom: (input.uom ?? "each (ea)").trim() || "each (ea)",
      cost: asMoney(input.cost),
      price: asMoney(input.price),
      vendor: (input.vendor ?? "").trim(),
      mpn,
      barcode,
      reference: (input.reference ?? "").trim(),
    },
  });
}
