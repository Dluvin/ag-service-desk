import { prisma } from "./prisma";

export const REVEAL_US = "https://fim.api.us.fleetmatics.com";
export const REVEAL_EU = "https://fim.api.eu.fleetmatics.com";

export type RevealVehicleInfo = {
  number: string;
  name: string;
};

export type RevealLocation = {
  vehicleNumber: string;
  name?: string;
  lat: number;
  lng: number;
  updatedAt?: string;
  displayState?: string;
  address?: string;
};

type RevealCreds = {
  appId: string;
  username: string;
  password: string;
  baseUrl: string;
};

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asList(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const record = asRecord(item);
      return record ? [record] : asList(item);
    });
  }
  const record = asRecord(value);
  if (!record) return [];
  for (const key of [
    "Vehicles",
    "vehicles",
    "Items",
    "items",
    "Results",
    "results",
    "Data",
    "data",
    "Locations",
    "locations",
    "VehicleLocations",
    "vehicleLocations",
    "_embedded",
    "d",
  ]) {
    const nested = record[key];
    if (nested != null) {
      const list = asList(nested);
      if (list.length > 0) return list;
    }
  }
  if (
    pickString(record, ["VehicleNumber", "vehicleNumber", "Name", "name", "VehicleName"]) ||
    pickNumber(record, ["Latitude", "latitude", "Lat", "lat"]) != null
  ) {
    return [record];
  }
  return [];
}

function pickString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return "";
}

function pickNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    const n = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function deepPickNumber(record: Record<string, unknown>, keys: string[], depth = 0): number | null {
  const direct = pickNumber(record, keys);
  if (direct != null) return direct;
  if (depth > 6) return null;
  for (const nested of Object.values(record)) {
    const child = asRecord(nested);
    if (!child) continue;
    const found = deepPickNumber(child, keys, depth + 1);
    if (found != null) return found;
  }
  return null;
}

function flattenRevealItem(record: Record<string, unknown>): Record<string, unknown> {
  const vehicle = asRecord(record.Vehicle) ?? asRecord(record.vehicle);
  const content = asRecord(record.ContentResource) ?? asRecord(record.contentResource);
  const value = content ? asRecord(content.Value) ?? asRecord(content.value) : null;
  return { ...record, ...vehicle, ...content, ...value };
}

function formatRevealAddress(record: Record<string, unknown>) {
  const formatted = pickString(record, ["FormattedAddress", "formattedAddress"]);
  if (formatted) return formatted;
  const address = asRecord(record.Address) ?? asRecord(record.address);
  if (!address) {
    const asText = record.Address ?? record.address;
    return typeof asText === "string" ? asText.trim() : "";
  }
  return [
    pickString(address, ["AddressLine1", "addressLine1"]),
    pickString(address, ["Locality", "locality", "City", "city"]),
    pickString(address, ["AdministrativeArea", "administrativeArea", "Region", "region"]),
    pickString(address, ["PostalCode", "postalCode"]),
  ]
    .filter(Boolean)
    .join(", ");
}

function locationFromRecord(record: Record<string, unknown>, fallbackNumber = ""): RevealLocation | null {
  const item = flattenRevealItem(record);
  const lat = deepPickNumber(item, ["Latitude", "latitude", "Lat", "lat"]);
  const lng = deepPickNumber(item, ["Longitude", "longitude", "Lng", "lng", "Lon", "lon"]);
  if (lat == null || lng == null) return null;
  const parsedNumber =
    pickString(item, ["VehicleNumber", "vehicleNumber"]) ||
    pickString(item, ["Number", "number", "VehicleId", "vehicleId"]);
  if (parsedNumber && fallbackNumber && locationKey(parsedNumber) !== locationKey(fallbackNumber)) {
    return null;
  }
  const vehicleNumber = parsedNumber || fallbackNumber || `${lat.toFixed(5)},${lng.toFixed(5)}`;
  return {
    vehicleNumber,
    name: pickString(item, ["Name", "name", "VehicleName", "vehicleName"]) || undefined,
    lat,
    lng,
    updatedAt: pickString(item, ["UpdateUTC", "updateUTC", "UpdatedAt", "updatedAt"]) || undefined,
    displayState: pickString(item, ["DisplayState", "displayState"]) || undefined,
    address: formatRevealAddress(item) || undefined,
  };
}

function collectGpsRecords(value: unknown, depth = 0): Record<string, unknown>[] {
  if (depth > 10) return [];
  if (Array.isArray(value)) return value.flatMap((item) => collectGpsRecords(item, depth + 1));
  const record = asRecord(value);
  if (!record) return [];
  const rows: Record<string, unknown>[] = [];
  if (locationFromRecord(record)) rows.push(record);
  for (const nested of Object.values(record)) {
    if (nested && typeof nested === "object") rows.push(...collectGpsRecords(nested, depth + 1));
  }
  return rows;
}

function locationsFromPayload(json: unknown, allowedNumbers: string[] = []): RevealLocation[] {
  const allowed = new Set(allowedNumbers.map(locationKey).filter(Boolean));
  const found: RevealLocation[] = [];
  const seen = new Set<string>();
  const rows = collectGpsRecords(json);
  const source = rows.length > 0 ? rows : asList(json);
  for (const row of source) {
    const parsedId =
      pickString(flattenRevealItem(row), ["VehicleNumber", "vehicleNumber"]) ||
      pickString(flattenRevealItem(row), ["Number", "number", "VehicleId", "vehicleId"]);
    const fallback = parsedId ? "" : allowedNumbers.length === 1 ? allowedNumbers[0] : "";
    const location = locationFromRecord(row, fallback);
    if (!location) continue;
    const point = `${location.lat.toFixed(5)},${location.lng.toFixed(5)}:${locationKey(location.vehicleNumber)}`;
    if (seen.has(point)) continue;
    seen.add(point);
    found.push(location);
  }
  if (allowed.size === 0) return found;
  const matched = found.filter((location) => allowed.has(locationKey(location.vehicleNumber)));
  return matched.length > 0 ? matched : found;
}

function matchLocationsToCatalog(
  parsed: RevealLocation[],
  catalog: { number: string; name: string }[],
): RevealLocation[] {
  const result = new Map<string, RevealLocation>();
  const usedPoints = new Set<string>();
  const point = (location: RevealLocation) => `${location.lat.toFixed(5)},${location.lng.toFixed(5)}`;
  const take = (number: string, location: RevealLocation, name?: string) => {
    result.set(locationKey(number), { ...location, vehicleNumber: number, name: location.name || name });
    usedPoints.add(point(location));
  };
  for (const location of parsed) {
    const hit = catalog.find((vehicle) => locationKey(vehicle.number) === locationKey(location.vehicleNumber));
    if (hit) take(hit.number, location, hit.name);
  }
  for (const location of parsed) {
    if (!location.name) continue;
    const hit = catalog.find((vehicle) => locationKey(vehicle.name) === locationKey(location.name || ""));
    if (hit && !result.has(locationKey(hit.number))) take(hit.number, location, hit.name);
  }
  for (const location of parsed) {
    if (usedPoints.has(point(location))) continue;
    take(location.vehicleNumber, location, location.name);
  }
  return [...result.values()];
}

export function orgHasRevealCreds(org: {
  revealAppId: string | null;
  revealUsername: string | null;
  revealPassword: string | null;
}) {
  return Boolean(org.revealAppId && org.revealUsername && org.revealPassword);
}

export function normalizeRevealAppId(raw: string) {
  let value = raw.trim().replace(/^["']+|["']+$/g, "");
  const fromHeader = value.match(/atmosphere_app_id\s*=\s*([^,]+)/i);
  if (fromHeader) value = fromHeader[1].trim();
  value = value.replace(/,?\s*Bearer\s+\S[\s\S]*$/i, "").trim();
  return value;
}

export async function loadRevealCreds(organizationId: string): Promise<RevealCreds | null> {
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) return null;
  const appId = normalizeRevealAppId(org.revealAppId || process.env.REVEAL_APP_ID || "");
  const username = (org.revealUsername || process.env.REVEAL_USERNAME || "").trim();
  const password = org.revealPassword || process.env.REVEAL_PASSWORD || "";
  const baseUrl = (org.revealBaseUrl || process.env.REVEAL_BASE_URL || REVEAL_US).replace(/\/$/, "");
  if (!appId || !username || !password) return null;
  return { appId, username, password, baseUrl };
}

function atmosphere(appId: string, token: string) {
  return `Atmosphere atmosphere_app_id=${normalizeRevealAppId(appId)}, Bearer ${token}`;
}

async function readBody(res: Response) {
  const text = await res.text();
  if (!text) return { raw: "", json: null as unknown };
  try {
    return { raw: text, json: JSON.parse(text) as unknown };
  } catch {
    return { raw: text, json: null as unknown };
  }
}

function parseToken(raw: string, json: unknown) {
  if (typeof json === "string" && json.trim()) return json.trim().replace(/^"|"$/g, "");
  const record = asRecord(json);
  if (record) {
    const token = pickString(record, ["Token", "token", "access_token", "AccessToken"]);
    if (token) return token;
  }
  const stripped = raw.trim().replace(/^"|"$/g, "");
  return stripped || null;
}

async function getToken(creds: RevealCreds) {
  const cached = tokenCache.get(creds.username);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const attempts: { Accept: string }[] = [{ Accept: "application/json" }, { Accept: "text/plain" }];
  let lastError = "Reveal token request failed.";
  for (const headers of attempts) {
    const res = await fetch(`${creds.baseUrl}/token`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${creds.username}:${creds.password}`).toString("base64")}`,
        ...headers,
      },
      cache: "no-store",
    });
    const { raw, json } = await readBody(res);
    if (!res.ok) {
      lastError = `Reveal token failed (${res.status}): ${raw.slice(0, 280) || res.statusText}`;
      continue;
    }
    const token = parseToken(raw, json);
    if (token) {
      tokenCache.set(creds.username, { token, expiresAt: Date.now() + 18 * 60_000 });
      return token;
    }
    lastError = "Reveal token response was empty.";
  }
  throw new Error(lastError);
}

async function revealFetch(creds: RevealCreds, path: string, init?: RequestInit) {
  const token = await getToken(creds);
  const res = await fetch(`${creds.baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: atmosphere(creds.appId, token),
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
  const { raw, json } = await readBody(res);
  if (!res.ok) {
    throw new Error(`Reveal ${path} failed (${res.status}): ${raw.slice(0, 280) || res.statusText}`);
  }
  return json;
}

export async function listRevealVehicles(organizationId: string): Promise<RevealVehicleInfo[]> {
  const creds = await loadRevealCreds(organizationId);
  if (!creds) throw new Error("Verizon Connect Reveal is not configured.");
  const json = await revealFetch(creds, "/cmd/v1/vehicles");
  return asList(json)
    .map((item) => {
      const row = flattenRevealItem(item);
      const number =
        pickString(row, ["VehicleNumber", "vehicleNumber"]) ||
        pickString(row, ["Number", "number", "VehicleId", "vehicleId"]);
      const name =
        pickString(row, ["VehicleName", "vehicleName", "Name", "name", "Description", "description", "DisplayName"]) ||
        number;
      return { number, name };
    })
    .filter((item) => item.number);
}

export async function storedRevealVehicles(organizationId: string): Promise<RevealVehicleInfo[]> {
  try {
    return await prisma.revealVehicle.findMany({
      where: { organizationId, active: true },
      orderBy: { name: "asc" },
      select: { number: true, name: true },
    });
  } catch (error) {
    console.error("storedRevealVehicles failed", error);
    return [];
  }
}

export async function syncRevealVehicles(organizationId: string): Promise<RevealVehicleInfo[]> {
  const live = await listRevealVehicles(organizationId);
  const byNumber = new Map(live.map((vehicle) => [vehicle.number, vehicle]));
  const unique = [...byNumber.values()];
  const numbers = unique.map((vehicle) => vehicle.number);
  const syncedAt = new Date();
  await prisma.$transaction(async (tx) => {
    for (const vehicle of unique) {
      await tx.revealVehicle.upsert({
        where: { organizationId_number: { organizationId, number: vehicle.number } },
        create: {
          organizationId,
          number: vehicle.number,
          name: vehicle.name,
          active: true,
          syncedAt,
        },
        update: { name: vehicle.name, active: true, syncedAt },
      });
    }
    await tx.revealVehicle.updateMany({
      where: { organizationId, ...(numbers.length > 0 ? { number: { notIn: numbers } } : {}) },
      data: { active: false },
    });
  });
  return storedRevealVehicles(organizationId);
}

function locationKey(value: string) {
  return value.trim().toLowerCase();
}

function locationForVehicle(json: unknown, number: string): RevealLocation | null {
  const parsed = locationsFromPayload(json, [number]);
  const match = parsed.find((location) => locationKey(location.vehicleNumber) === locationKey(number));
  if (match) return { ...match, vehicleNumber: number };
  if (parsed.length === 1 && !pickString(flattenRevealItem(asRecord(json) ?? {}), ["VehicleNumber", "vehicleNumber"])) {
    return { ...parsed[0], vehicleNumber: number };
  }
  const rows = collectGpsRecords(json);
  if (rows.length === 1) {
    const only = locationFromRecord(rows[0], number);
    if (only) return { ...only, vehicleNumber: number };
  }
  return null;
}

async function fetchGetLocation(creds: RevealCreds, number: string) {
  const path = `/rad/v1/vehicles/${encodeURIComponent(number)}/location`;
  try {
    const json = await revealFetch(creds, path);
    const location = locationForVehicle(json, number);
    if (location) return { location, error: null as string | null };
    return { location: null as RevealLocation | null, error: `${number}: Vehicle Update API v1 returned no GPS` };
  } catch (error) {
    return {
      location: null as RevealLocation | null,
      error: error instanceof Error ? error.message : `${number}: Vehicle Update API v1 location failed`,
    };
  }
}

async function postVehicleNumbers(creds: RevealCreds, path: string, numbers: string[]) {
  return revealFetch(creds, path, {
    method: "POST",
    body: JSON.stringify(numbers),
  });
}

export async function fetchRevealLocations(
  organizationId: string,
  vehicleNumbers?: string[],
): Promise<RevealLocation[]> {
  return (await fetchRevealLocationReport(organizationId, vehicleNumbers)).locations;
}

export async function fetchRevealLocationReport(
  organizationId: string,
  vehicleNumbers?: string[],
): Promise<{ locations: RevealLocation[]; errors: string[]; requested: number }> {
  const creds = await loadRevealCreds(organizationId);
  if (!creds) throw new Error("Verizon Connect Reveal is not configured.");

  let numbers = (vehicleNumbers ?? []).filter(Boolean);
  if (numbers.length === 0) {
    const stored = await storedRevealVehicles(organizationId);
    if (stored.length > 0) {
      numbers = stored.map((vehicle) => vehicle.number);
    } else {
      try {
        numbers = (await listRevealVehicles(organizationId)).map((vehicle) => vehicle.number);
      } catch (error) {
        const mapped = await prisma.user.findMany({
          where: { organizationId, revealVehicleNumber: { not: null } },
          select: { revealVehicleNumber: true },
        });
        numbers = mapped.map((user) => user.revealVehicleNumber).filter((value): value is string => Boolean(value));
        if (numbers.length === 0) throw error;
      }
    }
  }
  if (numbers.length === 0) return { locations: [], errors: [], requested: 0 };

  const stored = await storedRevealVehicles(organizationId);
  const catalog = stored.length > 0 ? stored : numbers.map((number) => ({ number, name: number }));
  const parsed: RevealLocation[] = [];
  const errors: string[] = [];
  let gotAny = false;

  for (let i = 0; i < numbers.length; i += 5) {
    const chunk = numbers.slice(i, i + 5);
    const got = await Promise.all(chunk.map((number) => fetchGetLocation(creds, number)));
    got.forEach((result) => {
      if (result.location) {
        gotAny = true;
        parsed.push(result.location);
      } else if (result.error && errors.length < 3) {
        errors.push(result.error.slice(0, 220));
      }
    });
  }

  const missing = numbers.filter(
    (number) => !parsed.some((location) => locationKey(location.vehicleNumber) === locationKey(number)),
  );
  if (missing.length > 0) {
    try {
      const json = await postVehicleNumbers(creds, "/rad/v1/vehicles/locations", missing);
      gotAny = true;
      parsed.push(...locationsFromPayload(json, missing));
    } catch (error) {
      if (errors.length < 3) {
        errors.push(error instanceof Error ? error.message.slice(0, 220) : "Bulk GPS request failed.");
      }
    }
  }

  const locations = matchLocationsToCatalog(parsed, catalog);

  if (!gotAny && locations.length === 0) {
    errors.length = 0;
    errors.push(
      "Verizon Vehicle Update API v1 GET /rad/v1/vehicles/{vehicleNumber}/location did not return GPS.",
    );
  } else if (locations.length < numbers.length) {
    const detail = errors[0] ? ` ${errors[0]}` : "";
    errors.length = 0;
    errors.push(
      `GPS from Vehicle Update API v1 for ${locations.length} of ${numbers.length} trucks.${detail}`,
    );
  } else {
    errors.length = 0;
  }

  return { locations, errors, requested: numbers.length };
}

export function clearRevealTokenCache() {
  tokenCache.clear();
}
