export type ImportedPart = {
  name: string;
  sku: string | null;
  description: string | null;
  itemType: string | null;
  price: number | null;
  cost: number | null;
  quantityOnHand: number | null;
};

const SKIP_TYPES = new Set([
  "category",
  "discount",
  "payment",
  "subtotal",
  "sales tax",
  "salestax",
  "group",
]);

const HEADER_ALIASES: Record<string, keyof ImportedPart | "skip"> = {
  "product/service name": "name",
  "product/service": "name",
  "item": "name",
  "item name": "name",
  name: "name",
  sku: "sku",
  "item sku": "sku",
  "manuf. sku": "sku",
  type: "itemType",
  "item type": "itemType",
  "product/service type": "itemType",
  "sales description": "description",
  description: "description",
  "purchase description": "description",
  "sales price": "price",
  "sales price / rate": "price",
  "sales price/rate": "price",
  price: "price",
  rate: "price",
  "purchase cost": "cost",
  cost: "cost",
  "quantity on hand": "quantityOnHand",
  "qty on hand": "quantityOnHand",
  quantity: "quantityOnHand",
  qty: "quantityOnHand",
  qnty: "quantityOnHand",
};

function normalizeHeader(value: string) {
  return value.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/\s+/g, " ");
}

function parseMoney(value: string) {
  const cleaned = value.replace(/[$,]/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === "," || ch === "\t") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function mapCsvRows(rows: string[][]): ImportedPart[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map(normalizeHeader);
  const indexes = headers.map((header) => HEADER_ALIASES[header] ?? null);
  if (!indexes.includes("name")) return [];

  const parts: ImportedPart[] = [];
  for (const row of rows.slice(1)) {
    const raw: Partial<ImportedPart> = {};
    indexes.forEach((field, i) => {
      if (!field || field === "skip") return;
      const value = (row[i] ?? "").trim();
      if (field === "price" || field === "cost" || field === "quantityOnHand") {
        raw[field] = parseMoney(value);
      } else if (field === "sku" || field === "description" || field === "itemType") {
        raw[field] = value || null;
      } else {
        raw[field] = value;
      }
    });
    const name = String(raw.name ?? "").trim();
    const type = (raw.itemType ?? "").toLowerCase();
    if (!name || SKIP_TYPES.has(type)) continue;
    parts.push({
      name,
      sku: raw.sku || null,
      description: raw.description || null,
      itemType: raw.itemType || null,
      price: raw.price ?? null,
      cost: raw.cost ?? null,
      quantityOnHand: raw.quantityOnHand ?? null,
    });
  }
  return parts;
}

function parseIif(text: string): ImportedPart[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  const header = lines.find((line) => line.startsWith("!INVITEM"));
  if (!header) return [];
  const columns = header.split("\t").map((col) => col.replace(/^!/, "").trim().toUpperCase());
  const nameI = columns.indexOf("NAME");
  const descI = columns.indexOf("DESC");
  const typeI = columns.indexOf("INVITEMTYPE");
  const priceI = columns.indexOf("PRICE");
  const costI = columns.indexOf("COST");
  const qtyI = columns.indexOf("QNTY") >= 0 ? columns.indexOf("QNTY") : columns.indexOf("QUANTITY");
  if (nameI < 0) return [];

  const parts: ImportedPart[] = [];
  for (const line of lines) {
    if (!line.startsWith("INVITEM") || line.startsWith("!")) continue;
    const cols = line.split("\t");
    const name = (cols[nameI] ?? "").trim();
    const type = (cols[typeI] ?? "").trim();
    if (!name || SKIP_TYPES.has(type.toLowerCase())) continue;
    parts.push({
      name,
      sku: null,
      description: descI >= 0 ? cols[descI]?.trim() || null : null,
      itemType: type || null,
      price: priceI >= 0 ? parseMoney(cols[priceI] ?? "") : null,
      cost: costI >= 0 ? parseMoney(cols[costI] ?? "") : null,
      quantityOnHand: qtyI >= 0 ? parseMoney(cols[qtyI] ?? "") : null,
    });
  }
  return parts;
}

export function parseQuickbooksExport(text: string): ImportedPart[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.includes("!INVITEM") || trimmed.split("\n")[0]?.startsWith("INVITEM")) {
    return parseIif(trimmed);
  }
  return mapCsvRows(parseCsv(trimmed));
}
