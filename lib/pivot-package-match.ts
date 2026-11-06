import type { PivotPackage } from "./pivot-packages";

const NAME_STOP = new Set([
  "and",
  "bros",
  "brothers",
  "co",
  "company",
  "county",
  "dairy",
  "equipment",
  "farm",
  "farms",
  "for",
  "inc",
  "irrigation",
  "lindsay",
  "llc",
  "new",
  "package",
  "pivot",
  "pivots",
  "ranch",
  "reinke",
  "sprinkler",
  "the",
  "tower",
  "towers",
  "valley",
  "valmont",
  "zimmatic",
]);

const WEAK_PIVOT_NAMES = new Set([
  "bigpivot",
  "housepivot",
  "mainfarm",
  "newpivots",
  "shopfarm",
  "swamppivot",
  "well",
]);

export type PivotPackageIdentity = {
  item: string;
  description: string;
  mpn?: string;
  barcode?: string;
  reference?: string;
};

export type PivotPackageIndex<T extends PivotPackageIdentity> = {
  rows: { pkg: T; hay: string; norm: string }[];
  byId: Map<string, T[]>;
};

export type PackageFacts = {
  brand: string;
  towerCount: string;
  lengthFeet: string;
};

export function normalizePackageId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function hasWord(hay: string, token: string) {
  return new RegExp(`(?:^|[^a-z0-9])${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:[^a-z0-9]|$)`).test(hay);
}

function collectNumbers(value: string) {
  return [...value.matchAll(/\d+(?:\.\d+)?/g)].map((match) => match[0].replace(/^0+/, "") || "0");
}

function descriptionNumbers(hay: string) {
  const towers = hay.match(/(?:^|[^a-z0-9])(\d+)\s*-?\s*towers?(?:[^a-z0-9]|$)/i)?.[1] ?? "";
  return collectNumbers(hay).filter((number) => number.split(".")[0] !== towers);
}

function samePivotNumber(hint: string, found: string) {
  if (hint === found) return true;
  const hintWhole = hint.split(".")[0];
  const foundWhole = found.split(".")[0];
  return hintWhole.length >= 3 && hintWhole === foundWhole;
}

export function indexPivotPackages<T extends PivotPackageIdentity>(packages: T[]): PivotPackageIndex<T> {
  const byId = new Map<string, T[]>();
  const rows = packages.map((pkg) => {
    const ids = [pkg.item, pkg.mpn ?? "", pkg.barcode ?? "", pkg.reference ?? ""]
      .map((value) => normalizePackageId(value))
      .filter((id) => id.length >= 3);
    for (const id of new Set(ids)) {
      const list = byId.get(id) ?? [];
      list.push(pkg);
      byId.set(id, list);
    }
    return {
      pkg,
      hay: pkg.description.toLowerCase(),
      norm: normalizePackageId(pkg.description),
    };
  });
  return { rows, byId };
}

const PACKAGE_BRANDS: { name: string; test: (description: string) => boolean }[] = [
  { name: "Valley", test: (description) => /valley/i.test(description) },
  { name: "Zimmatic", test: (description) => /zimmatic/i.test(description) },
  { name: "Reinke", test: (description) => /reinke/i.test(description) },
  { name: "Lindsay", test: (description) => /lindsay/i.test(description) },
  { name: "Pierce", test: (description) => /pierce/i.test(description) },
  { name: "T-L", test: (description) => /\bt-?l\b/i.test(description) },
  { name: "Olson", test: (description) => /olson/i.test(description) },
];

export function factsFromPackage(description: string): PackageFacts {
  const brand = PACKAGE_BRANDS.find((entry) => entry.test(description))?.name ?? "";
  const towerCount = description.match(/\b(\d+)\s*-?\s*towers?\b/i)?.[1] ?? "";
  const lengthFeet =
    description.match(/(\d+(?:\.\d+)?)\s*(?:'|ft|feet)\b/i)?.[1] ??
    description.match(/pivot\s*[-–]?\s*(\d+(?:\.\d+)?)/i)?.[1] ??
    "";
  return { brand, towerCount, lengthFeet };
}

export function findPackagesBySerial<T extends PivotPackageIdentity>(index: PivotPackageIndex<T>, serial: string) {
  const id = normalizePackageId(serial);
  if (id.length < 3) return [];
  const exact = index.byId.get(id) ?? [];
  const seen = new Set<string>();
  const matches: T[] = [];
  for (const pkg of exact) {
    const key = pkg.item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    matches.push(pkg);
  }
  if (matches.length) return matches.slice(0, 8);
  const numbers = collectNumbers(serial).filter((number) => number.split(".")[0].length >= 3);
  if (!numbers.length) return [];
  const numbered = index.rows.filter((row) => {
    const found = descriptionNumbers(row.hay);
    return numbers.some((hint) => found.some((number) => samePivotNumber(hint, number)));
  });
  if (numbered.length === 0 || numbered.length > 8) return [];
  return numbered.map((row) => row.pkg);
}

function collapseNearDuplicates<T extends PivotPackageIdentity>(hits: T[]) {
  if (hits.length <= 1) return hits;
  const preferred = hits.filter((pkg) => /sprinkler\s+package/i.test(pkg.description));
  const pool = preferred.length ? preferred : hits;
  const byKey = new Map<string, T>();
  for (const pkg of pool) {
    const key = normalizePackageId(pkg.description.replace(/sprinkler\s+package\s+for/gi, " "));
    if (!byKey.has(key)) byKey.set(key, pkg);
  }
  return [...byKey.values()];
}

function isStrongPivotName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return false;
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) return false;
  const norm = normalizePackageId(trimmed);
  if (norm.length < 4) return false;
  if (WEAK_PIVOT_NAMES.has(norm)) return false;
  if (!/[a-z]/.test(norm)) return false;
  return true;
}

export type ExactPackageMatch<T extends PivotPackageIdentity> = {
  pkg: T;
  how: "serial" | "pivotName";
};

export function findExactPackageForPivot<T extends PivotPackageIdentity>(
  index: PivotPackageIndex<T>,
  input: { name: string; serialNumber?: string | null },
): ExactPackageMatch<T> | null {
  const serial = normalizePackageId(input.serialNumber ?? "");
  if (serial.length >= 3) {
    const hits = collapseNearDuplicates(index.byId.get(serial) ?? []);
    if (hits.length === 1) return { pkg: hits[0], how: "serial" };
  }

  if (!isStrongPivotName(input.name)) return null;
  const nameNorm = normalizePackageId(input.name);
  let hits = collapseNearDuplicates(index.rows.filter((row) => row.norm.includes(nameNorm)).map((row) => row.pkg));

  if (hits.length > 1) {
    const nums = [...input.name.matchAll(/\d+/g)].map((match) => match[0]).filter((n) => n.length >= 1);
    if (nums.length) {
      hits = hits.filter((pkg) => nums.every((n) => hasWord(pkg.description.toLowerCase(), n)));
      hits = collapseNearDuplicates(hits);
    }
  }

  if (hits.length === 1) return { pkg: hits[0], how: "pivotName" };
  return null;
}

export function packageFieldsFromMatch(pkg: PivotPackage) {
  const facts = factsFromPackage(pkg.description);
  return {
    packageItem: pkg.item,
    packageDescription: pkg.description,
    packageBrand: facts.brand || null,
    packageTowerCount: facts.towerCount ? Number(facts.towerCount) : null,
    packageLengthFeet: facts.lengthFeet || null,
    packageVendor: pkg.vendor || null,
    packageMatchedAt: new Date(),
  };
}

export function emptyPackageFields() {
  return {
    packageItem: null as string | null,
    packageDescription: null as string | null,
    packageBrand: null as string | null,
    packageTowerCount: null as number | null,
    packageLengthFeet: null as string | null,
    packageVendor: null as string | null,
    packageMatchedAt: null as Date | null,
  };
}

export function ownerTokens(customerName: string) {
  const owner = customerName.replace(/\s*\([^)]*\)\s*$/, "");
  const tokens = owner
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !NAME_STOP.has(token));
  const strong = tokens.filter((token) => token.length >= 4);
  return strong.length ? strong : tokens;
}
