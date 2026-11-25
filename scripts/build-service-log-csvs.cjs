/**
 * Convert raw sheet JSON dumps in tmp/service-log-sync/raw-*.json into import CSVs.
 *
 * Raw formats:
 *   raw-moultrie.json / raw-live-oak.json / raw-fitzgerald.json / raw-americus.json
 *     { values: string[][] }
 *   raw-unadilla.xlsx  (xlsx file) OR raw-unadilla.json { values: string[][] }
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SYNC_DIR = path.join(ROOT, "tmp", "service-log-sync");
const CUTOFF = new Date("2026-05-23T00:00:00");
const MAX_DATE = new Date("2026-12-31T23:59:59");

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function writeCsv(fileName, headers, rows) {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((key) => csvEscape(row[key])).join(","));
  }
  fs.writeFileSync(path.join(SYNC_DIR, fileName), `${lines.join("\n")}\n`, "utf8");
  console.log(`Wrote ${fileName}: ${rows.length} rows`);
}

function parseLooseDate(raw) {
  const text = String(raw || "").trim().replace(/\\/g, "");
  if (!text) return null;
  const mdy = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (mdy) {
    let year = Number(mdy[3]);
    if (year < 100) year += 2000;
    if (year < 2019 || year > 2027) return null;
    const d = new Date(year, Number(mdy[1]) - 1, Number(mdy[2]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const year = Number(iso[1]);
    if (year < 2019 || year > 2027) return null;
    const d = new Date(year, Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function isoDate(d) {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function loadValues(name) {
  const file = path.join(SYNC_DIR, name);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function normHeader(cell) {
  return String(cell || "")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function buildMoultrie(values) {
  if (!values?.length) return;
  // Skip blank/title row if first cell empty and ORDER # on row 0 or 1
  let headerIdx = 0;
  for (let i = 0; i < Math.min(3, values.length); i++) {
    if (normHeader(values[i][1]).includes("order")) {
      headerIdx = i;
      break;
    }
  }
  const rows = [];
  for (let i = headerIdx + 1; i < values.length; i++) {
    const cells = values[i] || [];
    const date = parseLooseDate(cells[0]);
    if (!date || date < CUTOFF) continue;
    const customer = String(cells[2] || "").trim();
    if (!customer) continue;
    rows.push({
      date: isoDate(date),
      customer,
      site: String(cells[3] || "").trim(),
      work: String(cells[4] || "").trim(),
      order_number: String(cells[1] || "").trim(),
      google_location: String(cells[5] || "").trim(),
      tech: String(cells[7] || cells[6] || "").trim(),
      sheet_row: String(i + 1),
      closed_green: "0",
    });
  }
  writeCsv("moultrie-wo-live.csv", [
    "date",
    "customer",
    "site",
    "work",
    "order_number",
    "google_location",
    "tech",
    "sheet_row",
    "closed_green",
  ], rows);
}

function buildLiveOak(values) {
  if (!values?.length) return;
  let headerIdx = 0;
  for (let i = 0; i < Math.min(5, values.length); i++) {
    if (normHeader(values[i][0]) === "date") {
      headerIdx = i;
      break;
    }
  }
  const rows = [];
  for (let i = headerIdx + 1; i < values.length; i++) {
    const cells = values[i] || [];
    const date = parseLooseDate(cells[0]);
    if (!date || date < CUTOFF) continue;
    const customer = String(cells[2] || "").trim();
    if (!customer) continue;
    const invoice = String(cells[10] || "").trim();
    if (/^void$/i.test(invoice)) continue;
    rows.push({
      date: isoDate(date),
      customer,
      site: String(cells[3] || "").trim(),
      work: String(cells[4] || "").trim(),
      order_number: String(cells[1] || "").trim(),
      google_location: String(cells[5] || "").trim(),
      est_number: String(cells[7] || "").trim(),
      tech: String(cells[8] || "").trim(),
      bom: String(cells[9] || "").trim(),
      invoice_number: invoice,
    });
  }
  writeCsv("live-oak-wo-live.csv", [
    "date",
    "customer",
    "site",
    "work",
    "order_number",
    "google_location",
    "est_number",
    "tech",
    "bom",
    "invoice_number",
  ], rows);
}

function buildFitzgerald(values) {
  if (!values?.length) return;
  let headerIdx = 0;
  for (let i = 0; i < Math.min(5, values.length); i++) {
    const joined = (values[i] || []).map(normHeader).join("|");
    if (joined.includes("customer") && joined.includes("call")) {
      headerIdx = i;
      break;
    }
  }
  const rows = [];
  for (let i = headerIdx + 1; i < values.length; i++) {
    const cells = values[i] || [];
    const dateRaw = String(cells[0] || "").trim();
    const customer = String(cells[1] || "").trim();
    if (!customer || /^\d{1,2}\/\d{1,2}$/.test(customer)) continue;
    // Fitzgerald dates are often MM/DD without year — assume current season year from nearby context
    let date = parseLooseDate(dateRaw);
    if (!date && /^\d{1,2}\/\d{1,2}$/.test(dateRaw)) {
      const [mm, dd] = dateRaw.split("/").map(Number);
      date = new Date(2026, mm - 1, dd);
    }
    if (!date || date < CUTOFF) continue;
    rows.push({
      date: isoDate(date),
      customer,
      work: String(cells[2] || "").trim(),
      google_location: String(cells[3] || "").trim(),
      employee: String(cells[5] || "").trim(),
      wo_number: String(cells[6] || "").trim(),
      sheet_row: String(i + 1),
      closed_yellow: "0",
    });
  }
  writeCsv("fitzgerald-wo-live.csv", [
    "date",
    "customer",
    "work",
    "google_location",
    "employee",
    "wo_number",
    "sheet_row",
    "closed_yellow",
  ], rows);
}

function buildAmericus(values) {
  if (!values?.length) return;
  let headerIdx = 0;
  for (let i = 0; i < Math.min(5, values.length); i++) {
    if (normHeader(values[i][0]) === "date") {
      headerIdx = i;
      break;
    }
  }
  const rows = [];
  for (let i = headerIdx + 1; i < values.length; i++) {
    const cells = values[i] || [];
    const date = parseLooseDate(cells[0]);
    if (!date || date < CUTOFF) continue;
    const customer = String(cells[1] || "").trim();
    if (!customer) continue;
    const invoice = String(cells[9] || "").trim();
    if (/^void$/i.test(invoice) || /^void$/i.test(String(cells[8] || ""))) continue;
    rows.push({
      date: isoDate(date),
      customer,
      site: String(cells[2] || "").trim(),
      work: String(cells[3] || "").trim(),
      order_number: String(cells[4] || "").trim(),
      job_location: String(cells[5] || "").trim(),
      est_number: String(cells[6] || "").trim(),
      tech: String(cells[8] || "").trim(),
      invoice_number: invoice,
    });
  }
  writeCsv("rbia-wo-live.csv", [
    "date",
    "customer",
    "site",
    "work",
    "order_number",
    "job_location",
    "est_number",
    "tech",
    "invoice_number",
  ], rows);
}

function parseUnadillaDate(raw) {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    // Excel serial date
    const epoch = Date.UTC(1899, 11, 30);
    const d = new Date(epoch + raw * 86400000);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return parseLooseDate(raw);
}

function buildUnadillaFromXlsx() {
  const xlsxPath = path.join(SYNC_DIR, "raw-unadilla.xlsx");
  if (!fs.existsSync(xlsxPath)) return false;
  const XLSX = require("xlsx");
  const wb = XLSX.readFile(xlsxPath, { cellDates: true });
  const ws = wb.Sheets["UNADILLA JOB LOG"] || wb.Sheets[wb.SheetNames[0]];
  const values = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  buildUnadillaValues(values);
  return true;
}

function buildUnadillaValues(values) {
  if (!values?.length) return;
  // Native xlsx layout: A blank, B date, C order, D customer, E site, F work, G location, I tech, L invoice
  let headerIdx = 0;
  for (let i = 0; i < Math.min(5, values.length); i++) {
    const joined = (values[i] || []).map(normHeader).join("|");
    if (joined.includes("customer") && joined.includes("order")) {
      headerIdx = i;
      break;
    }
  }
  const rows = [];
  for (let i = headerIdx + 1; i < values.length; i++) {
    const cells = values[i] || [];
    const date = parseUnadillaDate(cells[1]);
    if (!date || date < CUTOFF || date > MAX_DATE) continue;
    const customer = String(cells[3] || "").trim();
    if (!customer) continue;
    const invoice = String(cells[11] || "").trim();
    if (/^void$/i.test(invoice)) continue;
    let order = String(cells[2] || "").trim();
    if (/^\d+\.0$/.test(order)) order = order.slice(0, -2);
    rows.push({
      date: isoDate(date),
      customer,
      site: String(cells[4] || "").trim(),
      work: String(cells[5] || "").trim(),
      order_number: order,
      google_location: String(cells[6] || "").trim(),
      est_number: String(cells[9] || "").trim(),
      tech: String(cells[8] || "").trim(),
      bom: String(cells[10] || "").trim(),
      invoice_number: invoice,
    });
  }
  writeCsv("unadilla-wo-live.csv", [
    "date",
    "customer",
    "site",
    "work",
    "order_number",
    "google_location",
    "est_number",
    "tech",
    "bom",
    "invoice_number",
  ], rows);
}

function main() {
  fs.mkdirSync(SYNC_DIR, { recursive: true });
  const moultrie = loadValues("raw-moultrie.json");
  if (moultrie) buildMoultrie(moultrie.values || moultrie);
  const liveOak = loadValues("raw-live-oak.json");
  if (liveOak) buildLiveOak(liveOak.values || liveOak);
  const fitz = loadValues("raw-fitzgerald.json");
  if (fitz) buildFitzgerald(fitz.values || fitz);
  const americus = loadValues("raw-americus.json");
  if (americus) buildAmericus(americus.values || americus);
  if (!buildUnadillaFromXlsx()) {
    const unadilla = loadValues("raw-unadilla.json");
    if (unadilla) buildUnadillaValues(unadilla.values || unadilla);
  }
}

main();
