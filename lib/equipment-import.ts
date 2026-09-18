import { prisma } from "./prisma";
import { uniqueImportedParts, type ImportedPart } from "./quickbooks";

const WRITE_CHUNK = 50;
const EQUIPMENT_TYPES = new Set([
  "equipment",
  "rental",
  "other",
  "other charge",
  "othercharge",
  "fixed asset",
  "machine",
  "truck",
]);

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

function typeKey(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function pickEquipmentItems(parts: ImportedPart[]) {
  const equipment = parts.filter((part) => EQUIPMENT_TYPES.has(typeKey(part.itemType)));
  if (equipment.length) return uniqueImportedParts(equipment);
  return uniqueImportedParts(parts);
}

export function sanitizeImportedEquipment(input: unknown): ImportedPart[] {
  if (!Array.isArray(input)) return [];
  const items: ImportedPart[] = [];
  for (const row of input) {
    if (!row || typeof row !== "object") continue;
    const raw = row as Record<string, unknown>;
    const name = String(raw.name ?? "").trim();
    if (!name || name.length > 500) continue;
    items.push({
      name,
      sku: raw.sku ? String(raw.sku).trim() || null : null,
      description: raw.description ? String(raw.description).trim() || null : null,
      itemType: raw.itemType ? String(raw.itemType).trim() || null : "Equipment",
      price: money(raw.price ?? raw.rate),
      cost: money(raw.cost),
      quantityOnHand: null,
    });
  }
  return pickEquipmentItems(items);
}

export async function importCatalogEquipmentBatch(organizationId: string, input: ImportedPart[]) {
  const items = sanitizeImportedEquipment(input);
  if (items.length === 0) return { created: 0, updated: 0 };

  const existing = await prisma.catalogEquipment.findMany({
    where: { organizationId, name: { in: items.map((item) => item.name) } },
    select: { id: true, name: true, sku: true, description: true, itemType: true, rate: true },
  });
  const byName = new Map(existing.map((item) => [item.name, item]));

  const toCreate = [];
  const toUpdate = [];
  for (const item of items) {
    const current = byName.get(item.name);
    if (current) {
      toUpdate.push({
        id: current.id,
        sku: item.sku ?? current.sku,
        description: item.description ?? current.description,
        itemType: item.itemType ?? current.itemType,
        rate: item.price ?? current.rate,
      });
    } else {
      toCreate.push({
        organizationId,
        name: item.name,
        sku: item.sku,
        description: item.description,
        itemType: item.itemType,
        rate: item.price,
        source: "QUICKBOOKS",
      });
    }
  }

  for (const batch of chunk(toCreate, WRITE_CHUNK)) {
    await prisma.catalogEquipment.createMany({ data: batch });
  }
  for (const batch of chunk(toUpdate, 40)) {
    await prisma.$transaction(
      batch.map((item) =>
        prisma.catalogEquipment.update({
          where: { id: item.id },
          data: {
            sku: item.sku,
            description: item.description,
            itemType: item.itemType,
            rate: item.rate,
            source: "QUICKBOOKS",
            active: true,
          },
        }),
      ),
    );
  }

  return { created: toCreate.length, updated: toUpdate.length };
}
