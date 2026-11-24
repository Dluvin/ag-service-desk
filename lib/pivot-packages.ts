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

const moneyFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const plainMoney = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPackageMoney(value: number) {
  return moneyFormat.format(value);
}

export function packageSearchText(pkg: PivotPackage) {
  const cost = pkg.cost.toFixed(2);
  const price = pkg.price.toFixed(2);
  return [
    pkg.item,
    pkg.description,
    pkg.purchaseDescription,
    pkg.qty,
    pkg.uom,
    cost,
    price,
    plainMoney.format(pkg.cost),
    plainMoney.format(pkg.price),
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
