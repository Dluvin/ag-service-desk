import { parseMapsLocation } from "./maps";
import { normalizeHeader, parseCsv, parseNumber } from "./csv";

export type ImportedPivot = {
  name: string;
  grower: string | null;
  farm: string | null;
  field: string | null;
  serialNumber: string | null;
  latitude: number;
  longitude: number;
  locationNote: string | null;
};

const SKIP_TYPES = new Set([
  "crop link",
  "croplink",
  "grain",
  "grain trac",
  "bin",
  "weather",
  "probe",
  "soil",
  "pump",
]);

type Mapped = {
  name?: string;
  grower?: string;
  farm?: string;
  field?: string;
  serialNumber?: string;
  latitude?: string;
  longitude?: string;
  gps?: string;
  deviceType?: string;
};

const HEADER_ALIASES: Record<string, keyof Mapped> = {
  "device name": "name",
  "pivot name": "name",
  "equipment name": "name",
  "job site / location name": "name",
  "job site": "name",
  "location name": "name",
  name: "name",
  grower: "grower",
  "grower name": "grower",
  customer: "grower",
  "customer name": "grower",
  owner: "grower",
  farmer: "grower",
  "farmer name": "grower",
  client: "grower",
  farm: "farm",
  "farm name": "farm",
  field: "field",
  "field name": "field",
  latitude: "latitude",
  lat: "latitude",
  "gps latitude": "latitude",
  "gps lat": "latitude",
  y: "latitude",
  longitude: "longitude",
  lon: "longitude",
  lng: "longitude",
  long: "longitude",
  "gps longitude": "longitude",
  "gps long": "longitude",
  "gps lon": "longitude",
  x: "longitude",
  gps: "gps",
  location: "gps",
  coordinates: "gps",
  "google maps link": "gps",
  "maps link": "gps",
  "map link": "gps",
  "serial number": "serialNumber",
  serial: "serialNumber",
  "serial no": "serialNumber",
  "unit serial": "serialNumber",
  "device serial": "serialNumber",
  "device id": "serialNumber",
  "unit id": "serialNumber",
  type: "deviceType",
  "device type": "deviceType",
  "equipment type": "deviceType",
};

function coordsFrom(raw: Mapped) {
  const lat = parseNumber(raw.latitude ?? "");
  const lng = parseNumber(raw.longitude ?? "");
  if (lat != null && lng != null) return { latitude: lat, longitude: lng };
  if (raw.gps) return parseMapsLocation(raw.gps);
  return null;
}

export function parseAgSenseExport(text: string): ImportedPivot[] {
  const rows = parseCsv(text.trim());
  if (rows.length < 2) return [];
  const headers = rows[0].map(normalizeHeader);
  const indexes = headers.map((header) => HEADER_ALIASES[header] ?? null);
  if (!indexes.includes("name")) return [];

  const pivots: ImportedPivot[] = [];
  for (const row of rows.slice(1)) {
    const raw: Mapped = {};
    indexes.forEach((field, i) => {
      if (!field) return;
      raw[field] = (row[i] ?? "").trim();
    });
    const nameRaw = (raw.name ?? "").trim();
    const grower = raw.grower?.trim() || null;
    const type = (raw.deviceType ?? "").trim().toLowerCase();
    const placeholderSite = !nameRaw || /^\(no site recorded\)$/i.test(nameRaw);
    const name = placeholderSite ? grower || "" : nameRaw;
    if (!name || SKIP_TYPES.has(type)) continue;
    const coords = coordsFrom(raw);
    if (!coords) continue;
    if (coords.latitude < -90 || coords.latitude > 90 || coords.longitude < -180 || coords.longitude > 180) {
      continue;
    }
    const farm = raw.farm?.trim() || null;
    const field = raw.field?.trim() || null;
    const note = [field, farm, placeholderSite ? nameRaw || null : null].filter(Boolean).join(" · ") || null;
    pivots.push({
      name,
      grower,
      farm,
      field,
      serialNumber: raw.serialNumber?.trim() || null,
      latitude: coords.latitude,
      longitude: coords.longitude,
      locationNote: note,
    });
  }
  return pivots;
}
