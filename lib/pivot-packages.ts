export type PivotPackage = {
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
};

export function packageSearchText(pkg: PivotPackage) {
  return [
    pkg.item,
    pkg.description,
    pkg.purchaseDescription,
    pkg.vendor,
    pkg.mpn,
    pkg.barcode,
    pkg.reference,
  ]
    .join("\n")
    .toLowerCase();
}

export function searchPivotPackages(packages: PivotPackage[], query: string) {
  const tokens = query
    .toLowerCase()
    .replace(/\$/g, "")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
  if (!tokens.length) return [];
  const matches: PivotPackage[] = [];
  for (const pkg of packages) {
    const haystack = packageSearchText(pkg);
    if (tokens.every((token) => haystack.includes(token))) matches.push(pkg);
  }
  return matches;
}
