import { prisma } from "./prisma";
import { uniqueImportedParts, type ImportedPart } from "./quickbooks";

const WRITE_CHUNK = 50;

function chunk<T>(items: T[], size: number) {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}

function money(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.replace(/[$,]/g, "").trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function sanitizeImportedParts(input: unknown): ImportedPart[] {
  if (!Array.isArray(input)) return [];
  const parts: ImportedPart[] = [];
  for (const row of input) {
    if (!row || typeof row !== "object") continue;
    const raw = row as Record<string, unknown>;
    const name = String(raw.name ?? "").trim();
    if (!name || name.length > 500) continue;
    parts.push({
      name,
      sku: raw.sku ? String(raw.sku).trim() || null : null,
      description: raw.description ? String(raw.description).trim() || null : null,
      itemType: raw.itemType ? String(raw.itemType).trim() || null : null,
      price: money(raw.price),
      cost: money(raw.cost),
      quantityOnHand: money(raw.quantityOnHand),
    });
  }
  return uniqueImportedParts(parts);
}

export async function importCatalogPartBatch(organizationId: string, input: ImportedPart[]) {
  const parts = sanitizeImportedParts(input);
  if (parts.length === 0) return { created: 0, updated: 0 };

  const existing = await prisma.catalogPart.findMany({
    where: { organizationId, name: { in: parts.map((part) => part.name) } },
    select: {
      id: true,
      name: true,
      sku: true,
      description: true,
      itemType: true,
      price: true,
      cost: true,
      quantityOnHand: true,
    },
  });
  const byName = new Map(existing.map((part) => [part.name, part]));

  const toCreate = [];
  const toUpdate = [];
  for (const part of parts) {
    const current = byName.get(part.name);
    if (current) {
      toUpdate.push({
        id: current.id,
        sku: part.sku ?? current.sku,
        description: part.description ?? current.description,
        itemType: part.itemType ?? current.itemType,
        price: part.price ?? current.price,
        cost: part.cost ?? current.cost,
        quantityOnHand: part.quantityOnHand ?? current.quantityOnHand,
      });
    } else {
      toCreate.push({
        organizationId,
        name: part.name,
        sku: part.sku,
        description: part.description,
        itemType: part.itemType,
        price: part.price,
        cost: part.cost,
        quantityOnHand: part.quantityOnHand,
        source: "QUICKBOOKS",
      });
    }
  }

  for (const batch of chunk(toCreate, WRITE_CHUNK)) {
    await prisma.catalogPart.createMany({ data: batch });
  }
  for (const batch of chunk(toUpdate, 40)) {
    await prisma.$transaction(
      batch.map((part) =>
        prisma.catalogPart.update({
          where: { id: part.id },
          data: {
            sku: part.sku,
            description: part.description,
            itemType: part.itemType,
            price: part.price,
            cost: part.cost,
            quantityOnHand: part.quantityOnHand,
            source: "QUICKBOOKS",
            active: true,
          },
        }),
      ),
    );
  }

  return { created: toCreate.length, updated: toUpdate.length };
}
