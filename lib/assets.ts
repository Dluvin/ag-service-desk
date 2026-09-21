import { prisma } from "./prisma";
import { slugify } from "./roles";

export const ASSET_KIND = {
  PIVOT: "PIVOT",
  GENERIC: "GENERIC",
} as const;

export type AssetKind = (typeof ASSET_KIND)[keyof typeof ASSET_KIND];

export const BUILTIN_ASSET_TYPES = [
  { slug: "pivots", name: "Pivots", kind: ASSET_KIND.PIVOT, sortOrder: 0 },
  { slug: "wells", name: "Wells", kind: ASSET_KIND.GENERIC, sortOrder: 1 },
  { slug: "pumps", name: "Pumps", kind: ASSET_KIND.GENERIC, sortOrder: 2 },
  { slug: "generators", name: "Generators", kind: ASSET_KIND.GENERIC, sortOrder: 3 },
] as const;

const RESERVED_ASSET_TYPE_SLUGS = new Set(["types", "new", "all"]);

export type AssetTypeRecord = {
  id: string;
  name: string;
  slug: string;
  kind: string;
  builtIn: boolean;
  sortOrder: number;
};

export function isPivotAssetType(type: { kind: string; slug: string }) {
  return type.kind === ASSET_KIND.PIVOT || type.slug === "pivots";
}

export function assetTypeHref(type: { slug: string }) {
  return `/assets?type=${encodeURIComponent(type.slug)}`;
}

export function assetTypeNewHref(type: { kind: string; slug: string }) {
  return isPivotAssetType(type) ? "/pivots/new" : `/assets/new?type=${encodeURIComponent(type.slug)}`;
}

export function assetTypeSingular(name: string) {
  if (name.endsWith("ies")) return `${name.slice(0, -3)}y`;
  if (name.endsWith("s") && !name.endsWith("ss")) return name.slice(0, -1);
  return name;
}

export type UnifiedAssetRow = {
  id: string;
  name: string;
  typeName: string;
  typeSlug: string;
  href: string;
  farmerName: string;
  latitude: number;
  longitude: number;
  serialNumber: string | null;
  locationNote: string | null;
};

export function pivotToUnifiedRow(
  pivot: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    serialNumber: string | null;
    locationNote: string | null;
    farmer: { name: string };
  },
  type: { name: string; slug: string } = { name: "Pivots", slug: "pivots" },
): UnifiedAssetRow {
  return {
    id: pivot.id,
    name: pivot.name,
    typeName: type.name,
    typeSlug: type.slug,
    href: `/pivots/${pivot.id}`,
    farmerName: pivot.farmer.name,
    latitude: pivot.latitude,
    longitude: pivot.longitude,
    serialNumber: pivot.serialNumber,
    locationNote: pivot.locationNote,
  };
}

export function assetToUnifiedRow(asset: {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  serialNumber: string | null;
  locationNote: string | null;
  farmer: { name: string };
  assetType: { name: string; slug: string };
}): UnifiedAssetRow {
  return {
    id: asset.id,
    name: asset.name,
    typeName: asset.assetType.name,
    typeSlug: asset.assetType.slug,
    href: `/assets/${asset.id}`,
    farmerName: asset.farmer.name,
    latitude: asset.latitude,
    longitude: asset.longitude,
    serialNumber: asset.serialNumber,
    locationNote: asset.locationNote,
  };
}

export function uniqueAssetTypeSlug(name: string, used: Set<string>) {
  let base = slugify(name) || "asset";
  if (RESERVED_ASSET_TYPE_SLUGS.has(base)) base = `${base}-type`;
  let key = base;
  let n = 2;
  while (used.has(key)) {
    key = `${base}-${n}`;
    n += 1;
  }
  return key;
}

export async function ensureAssetTypes(organizationId: string): Promise<AssetTypeRecord[]> {
  const existing = await prisma.assetType.findMany({
    where: { organizationId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const have = new Set(existing.map((type) => type.slug));
  const missing = BUILTIN_ASSET_TYPES.filter((type) => !have.has(type.slug));
  if (missing.length === 0) return existing;

  await prisma.assetType.createMany({
    data: missing.map((type) => ({
      organizationId,
      name: type.name,
      slug: type.slug,
      kind: type.kind,
      builtIn: true,
      sortOrder: type.sortOrder,
    })),
  });

  return prisma.assetType.findMany({
    where: { organizationId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export function builtinAssetTypeCreates(organizationId: string) {
  return BUILTIN_ASSET_TYPES.map((type) => ({
    organizationId,
    name: type.name,
    slug: type.slug,
    kind: type.kind,
    builtIn: true,
    sortOrder: type.sortOrder,
  }));
}
