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
  "header",
]);

const HEADER_ALIASES: Record<string, keyof ImportedPart | "skip"> = {
  "product/service name": "name",
  "product/service": "name",
  "product / service name": "name",
  "product / service": "name",
  "product service name": "name",
  "product name": "name",
  item: "name",
  "item name": "name",
  "item description": "description",
  "inventory item": "name",
  name: "name",
  fullname: "name",
  sku: "sku",
  "item sku": "sku",
  "manuf. sku": "sku",
  "mfg part number": "sku",
  "manufacturer part number": "sku",
  "manufactpartnumber": "sku",
  "item number": "sku",
  "part number": "sku",
  upc: "sku",
  "upc/ean": "sku",
  type: "itemType",
  "item type": "itemType",
  "product/service type": "itemType",
  "product/service type name": "itemType",
  "sales description": "description",
  description: "description",
  "purchase description": "description",
  "sales price": "price",
  "sales price / rate": "price",
  "sales price/rate": "price",
  "sales price (usd)": "price",
  price: "price",
  rate: "price",
  "price/rate": "price",
  "purchase cost": "cost",
  "purchase cost (usd)": "cost",
  cost: "cost",
  "quantity on hand": "quantityOnHand",
  "qty on hand": "quantityOnHand",
  "qty. on hand": "quantityOnHand",
  "on hand": "quantityOnHand",
  quantity: "quantityOnHand",
  qty: "quantityOnHand",
  qnty: "quantityOnHand",
  qoh: "quantityOnHand",
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

function detectDelimiter(text: string) {
  const sample = text.slice(0, 8000);
  const commas = (sample.match(/,/g) || []).length;
  const semis = (sample.match(/;/g) || []).length;
  const tabs = (sample.match(/\t/g) || []).length;
  if (tabs > commas && tabs > semis) return "\t";
  if (semis > commas) return ";";
  return ",";
}

function parseDelimited(text: string, delimiter: string): string[][] {
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
    } else if (ch === delimiter) {
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

function headerIndexes(headers: string[]) {
  return headers.map((header) => HEADER_ALIASES[normalizeHeader(header)] ?? null);
}

function findHeaderRow(rows: string[][]) {
  const limit = Math.min(rows.length, 80);
  for (let i = 0; i < limit; i++) {
    if (headerIndexes(rows[i]).includes("name")) return i;
  }
  return -1;
}

function mapCsvRows(rows: string[][]): ImportedPart[] {
  const headerIndex = findHeaderRow(rows);
  if (headerIndex < 0) return [];
  const indexes = headerIndexes(rows[headerIndex]);

  const parts: ImportedPart[] = [];
  for (const row of rows.slice(headerIndex + 1)) {
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
  const skuI = columns.findIndex((col) => col === "MANUFACTPARTNUMBER" || col === "PARTNUM" || col === "UPC");
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
      sku: skuI >= 0 ? cols[skuI]?.trim() || null : null,
      description: descI >= 0 ? cols[descI]?.trim() || null : null,
      itemType: type || null,
      price: priceI >= 0 ? parseMoney(cols[priceI] ?? "") : null,
      cost: costI >= 0 ? parseMoney(cols[costI] ?? "") : null,
      quantityOnHand: qtyI >= 0 ? parseMoney(cols[qtyI] ?? "") : null,
    });
  }
  return parts;
}

export function decodeImportBytes(bytes: Uint8Array) {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes);
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes);
  }
  return new TextDecoder("utf-8").decode(bytes);
}

export function parseQuickbooksExport(text: string): ImportedPart[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.includes("!INVITEM") || trimmed.split("\n")[0]?.startsWith("INVITEM")) {
    return parseIif(trimmed);
  }
  return mapCsvRows(parseDelimited(trimmed, detectDelimiter(trimmed)));
}

export function uniqueImportedParts(parts: ImportedPart[]) {
  const unique = new Map<string, ImportedPart>();
  for (const part of parts) unique.set(part.name, part);
  return [...unique.values()];
}
