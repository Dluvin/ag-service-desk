import { readFile } from "fs/promises";
import path from "path";
import type { PivotPackage } from "./pivot-packages";

let cached: PivotPackage[] | null = null;

function asMoney(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
}

function asText(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

export async function loadPivotPackages(): Promise<PivotPackage[]> {
  if (cached) return cached;
  const filePath = path.join(process.cwd(), "data", "pivot-packages.json");
  const raw = JSON.parse(await readFile(filePath, "utf8")) as unknown;
  if (!Array.isArray(raw)) {
    cached = [];
    return cached;
  }
  cached = raw.map((row) => {
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
  }).filter((pkg) => pkg.item);
  return cached;
}
