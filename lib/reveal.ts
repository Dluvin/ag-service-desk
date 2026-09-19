import { prisma } from "./prisma";

export const REVEAL_US = "https://fim.api.us.fleetmatics.com";
export const REVEAL_EU = "https://fim.api.eu.fleetmatics.com";

export type RevealVehicleInfo = {
  number: string;
  name: string;
};

type CmdVehicle = RevealVehicleInfo & { gpsIds: string[] };

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
    "Places",
    "places",
    "Geofences",
    "geofences",
    "ContentResource",
    "contentResource",
    "Value",
    "value",
    "_embedded",
    "d",
  ]) {
    const nested = record[key];
    if (nested != null) {
      const list = asList(nested);
      if (list.length > 0) return list;
    }
  }
  const wrappedPlace = asRecord(record.place) ?? asRecord(record.Place);
  if (wrappedPlace) {
    const list = asList(wrappedPlace);
    if (list.length > 0) return list;
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
  const place = asRecord(record.Place) ?? asRecord(record.place);
  const content = asRecord(record.ContentResource) ?? asRecord(record.contentResource);
  const value = content ? asRecord(content.Value) ?? asRecord(content.value) : null;
  return { ...record, ...vehicle, ...place, ...content, ...value };
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

function uniqueIds(values: string[]) {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(locationKey(trimmed))) continue;
    seen.add(locationKey(trimmed));
    ids.push(trimmed);
  }
  return ids;
}

function parseCmdVehicle(item: Record<string, unknown>): CmdVehicle | null {
  const row = flattenRevealItem(item);
  const name =
    pickString(row, ["VehicleName", "vehicleName", "Name", "name", "Description", "description", "DisplayName"]);
  const vehicleNumber = pickString(row, ["VehicleNumber", "vehicleNumber"]);
  const registration = pickString(row, ["RegistrationNumber", "registrationNumber"]);
  const otherId = pickString(row, ["Number", "number", "VehicleId", "vehicleId"]);
  const gpsIds = uniqueIds([vehicleNumber, registration]);
  const number = vehicleNumber || otherId || registration || name;
  if (!number) return null;
  return { number, name: name || number, gpsIds };
}

export async function listRevealVehicles(organizationId: string): Promise<RevealVehicleInfo[]> {
  return (await listRevealVehicleRecords(organizationId)).map(({ number, name }) => ({ number, name }));
}

async function listRevealVehicleRecords(organizationId: string) {
  const creds = await loadRevealCreds(organizationId);
  if (!creds) throw new Error("Verizon Connect Reveal is not configured.");
  const json = await revealFetch(creds, "/cmd/v1/vehicles");
  const fromList = asList(json).map(parseCmdVehicle).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const byNumber = new Map(fromList.map((vehicle) => [locationKey(vehicle.number), vehicle]));
  try {
    const groupsJson = await revealFetch(creds, "/cmd/v1/groups");
    const groups = asList(groupsJson);
    for (const group of groups) {
      const groupId =
        pickString(flattenRevealItem(group), ["GroupId", "groupId", "Id", "id", "GroupNumber", "groupNumber"]);
      if (!groupId) continue;
      for (const path of [`/cmd/v1/groups/${encodeURIComponent(groupId)}/vehicles`, `/cmd/v1/vehicles?groupid=${encodeURIComponent(groupId)}`]) {
        try {
          const vehiclesJson = await revealFetch(creds, path);
          for (const item of asList(vehiclesJson)) {
            const parsed = parseCmdVehicle(item);
            if (!parsed) continue;
            const existing = byNumber.get(locationKey(parsed.number));
            if (existing) {
              existing.gpsIds = uniqueIds([...existing.gpsIds, ...parsed.gpsIds]);
            } else {
              byNumber.set(locationKey(parsed.number), parsed);
            }
          }
          break;
        } catch {
          continue;
        }
      }
    }
  } catch {
    // Vehicle Update GPS does not require groups; ignore if CMD groups are unavailable.
  }
  return [...byNumber.values()];
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
  const live = await listRevealVehicleRecords(organizationId);
  const byName = new Map<string, (typeof live)[number]>();
  for (const vehicle of live) {
    const key = locationKey(vehicle.name || vehicle.number);
    const previous = byName.get(key);
    if (!previous || vehicle.gpsIds.length > previous.gpsIds.length) byName.set(key, vehicle);
  }
  const unique = [...byName.values()];
  const syncedAt = new Date();
  await prisma.$transaction(async (tx) => {
    const existing = await tx.revealVehicle.findMany({ where: { organizationId } });
    const keepIds = new Set<string>();

    for (const vehicle of unique) {
      const byNumber = existing.find(
        (row) => !keepIds.has(row.id) && locationKey(row.number) === locationKey(vehicle.number),
      );
      const byExistingName = existing.find(
        (row) => !keepIds.has(row.id) && locationKey(row.name) === locationKey(vehicle.name),
      );
      const row = byNumber ?? byExistingName;
      if (!row) {
        const created = await tx.revealVehicle.create({
          data: {
            organizationId,
            number: vehicle.number,
            name: vehicle.name,
            active: true,
            syncedAt,
          },
        });
        keepIds.add(created.id);
        continue;
      }

      keepIds.add(row.id);
      const oldNumber = row.number;
      if (oldNumber !== vehicle.number) {
        const clash = existing.find(
          (other) => other.id !== row.id && locationKey(other.number) === locationKey(vehicle.number),
        );
        if (clash) {
          keepIds.add(clash.id);
          keepIds.delete(row.id);
          await tx.revealVehicle.delete({ where: { id: row.id } });
          await tx.revealVehicle.update({
            where: { id: clash.id },
            data: {
              number: vehicle.number,
              name: vehicle.name,
              active: true,
              syncedAt,
              showOnMap: row.showOnMap,
            },
          });
        } else {
          await tx.revealVehicle.update({
            where: { id: row.id },
            data: { number: vehicle.number, name: vehicle.name, active: true, syncedAt },
          });
        }
        await tx.user.updateMany({
          where: { organizationId, revealVehicleNumber: oldNumber },
          data: { revealVehicleNumber: vehicle.number },
        });
        await tx.siteVisit.updateMany({
          where: { vehicleNumber: oldNumber, ticket: { organizationId } },
          data: { vehicleNumber: vehicle.number },
        });
      } else {
        await tx.revealVehicle.update({
          where: { id: row.id },
          data: { name: vehicle.name, active: true, syncedAt },
        });
      }
    }

    await tx.revealVehicle.deleteMany({
      where: { organizationId, ...(keepIds.size > 0 ? { id: { notIn: [...keepIds] } } : {}) },
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

async function fetchCmdVehicleAliases(creds: RevealCreds, id: string) {
  try {
    const json = await revealFetch(creds, `/cmd/v1/vehicles/${encodeURIComponent(id)}`);
    const record = asRecord(json) ?? asList(json)[0];
    if (!record) return [];
    return parseCmdVehicle(record)?.gpsIds ?? [];
  } catch {
    return [];
  }
}

async function fetchGetLocation(creds: RevealCreds, gpsIds: string[], canonicalNumber: string) {
  const queue = uniqueIds(gpsIds);
  const seen = new Set(queue.map(locationKey));
  let lastError = "";
  let notFound = 0;
  let expanded = false;
  for (let i = 0; i < queue.length; i += 1) {
    const id = queue[i];
    const path = `/rad/v1/vehicles/${encodeURIComponent(id)}/location`;
    try {
      const json = await revealFetch(creds, path);
      const location = locationForVehicle(json, id) ?? locationForVehicle(json, canonicalNumber);
      if (location) {
        return { location: { ...location, vehicleNumber: canonicalNumber }, error: null as string | null, notFound: false };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : `${id}: Vehicle Update API v1 location failed`;
      lastError = message;
      if (/\(404\)|Unable to locate vehicle/i.test(message)) {
        notFound += 1;
        if (!expanded) {
          expanded = true;
          for (const extra of await fetchCmdVehicleAliases(creds, id)) {
            if (seen.has(locationKey(extra))) continue;
            seen.add(locationKey(extra));
            queue.push(extra);
          }
        }
      }
    }
  }
  return {
    location: null as RevealLocation | null,
    error: lastError || null,
    notFound: notFound > 0 && notFound >= queue.length,
  };
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
): Promise<{
  locations: RevealLocation[];
  errors: string[];
  requested: number;
  withoutVehicleNumber: string[];
}> {
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
  if (numbers.length === 0) return { locations: [], errors: [], requested: 0, withoutVehicleNumber: [] };

  const stored = await storedRevealVehicles(organizationId);
  const catalog = stored.length > 0 ? stored : numbers.map((number) => ({ number, name: number }));
  let live: CmdVehicle[] = [];
  try {
    live = await listRevealVehicleRecords(organizationId);
  } catch {
    live = [];
  }
  const wanted = new Set(numbers.map(locationKey));
  const fromLive = live.filter(
    (vehicle) =>
      wanted.size === 0 ||
      wanted.has(locationKey(vehicle.number)) ||
      wanted.has(locationKey(vehicle.name)) ||
      vehicle.gpsIds.some((id) => wanted.has(locationKey(id))),
  );
  const jobs: CmdVehicle[] =
    live.length > 0
      ? fromLive.length > 0
        ? fromLive
        : live
      : numbers.map((number) => {
          const hit = catalog.find((vehicle) => locationKey(vehicle.number) === locationKey(number));
          return { number, name: hit?.name || number, gpsIds: uniqueIds([number]) };
        });

  const withGpsId = jobs.filter((job) => job.gpsIds.length > 0);
  const withoutGpsId = jobs.filter((job) => job.gpsIds.length === 0);

  const parsed: RevealLocation[] = [];
  const errors: string[] = [];
  let gotAny = false;
  let notFoundCount = 0;

  try {
    const ids = uniqueIds(withGpsId.flatMap((job) => job.gpsIds)).slice(0, 100);
    if (ids.length > 0) {
      for (const path of ["/rad/v1/vehicles/locations", "/rad/v1/vehicles/statuses"] as const) {
        try {
          const json = await revealFetch(creds, path, {
            method: "POST",
            body: JSON.stringify(ids),
          });
          const bulk = locationsFromPayload(json, []);
          if (bulk.length > 0) {
            gotAny = true;
            parsed.push(...bulk);
          }
        } catch {
          continue;
        }
      }
    }
  } catch {
    // Per-truck GET /vehicles/{vehicleNumber}/location still runs below.
  }

  const foundKeys = new Set(parsed.flatMap((location) => [locationKey(location.vehicleNumber), locationKey(location.name || "")]));
  const remaining = withGpsId.filter(
    (job) =>
      !foundKeys.has(locationKey(job.number)) &&
      !foundKeys.has(locationKey(job.name)) &&
      !job.gpsIds.some((id) => foundKeys.has(locationKey(id))),
  );

  for (let i = 0; i < remaining.length; i += 4) {
    const chunk = remaining.slice(i, i + 4);
    const got = await Promise.all(
      chunk.map((job) => fetchGetLocation(creds, job.gpsIds, job.number)),
    );
    got.forEach((result) => {
      if (result.location) {
        gotAny = true;
        parsed.push(result.location);
      } else {
        if (result.notFound) notFoundCount += 1;
        else if (result.error && errors.length < 2) errors.push(result.error.slice(0, 220));
      }
    });
  }

  const locations = matchLocationsToCatalog(parsed, catalog);

  errors.length = 0;
  if (withoutGpsId.length > 0) {
    errors.push(
      `${withoutGpsId.length} truck${withoutGpsId.length === 1 ? "" : "s"} ${withoutGpsId.length === 1 ? "has" : "have"} no Vehicle # in Reveal, so Vehicle Update cannot locate them. Fill Vehicle Number, then Refresh from Verizon.`,
    );
  }
  if (withGpsId.length > 0 && locations.length < withGpsId.length) {
    errors.push(
      `GPS for ${locations.length} of ${withGpsId.length} trucks that have a Vehicle #.${
        notFoundCount ? ` ${notFoundCount} still returned 404.` : ""
      }`,
    );
  } else if (withGpsId.length === 0 && locations.length === 0 && withoutGpsId.length === 0) {
    errors.push("Vehicle Update API v1 did not return GPS.");
  }

  return {
    locations,
    errors,
    requested: jobs.length,
    withoutVehicleNumber: withoutGpsId.map((job) => job.name || job.number),
  };
}

export type RevealPlace = {
  placeId: string;
  name: string;
  category: string;
  address: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  lat: string;
  lng: string;
  shape: string;
  phone: string;
  note: string;
};

function collectPlaceRecords(value: unknown, depth = 0): Record<string, unknown>[] {
  if (depth > 12) return [];
  if (Array.isArray(value)) return value.flatMap((item) => collectPlaceRecords(item, depth + 1));
  const record = asRecord(value);
  if (!record) return [];
  const item = flattenRevealItem(record);
  const isPlace = Boolean(
    pickString(item, ["GeoFenceName", "geofenceName", "PlaceName", "PlaceId", "placeId", "PlaceID"]) ||
      (pickString(item, ["CategoryName", "categoryName"]) &&
        pickString(item, ["Name", "name", "GeoFenceName", "geofenceName"])),
  );
  const rows = isPlace ? [record] : [];
  for (const nested of Object.values(record)) {
    if (nested && typeof nested === "object") rows.push(...collectPlaceRecords(nested, depth + 1));
  }
  return rows;
}

function parseRevealPlace(item: Record<string, unknown>): RevealPlace | null {
  const row = flattenRevealItem(item);
  const name = pickString(row, ["GeoFenceName", "geofenceName", "PlaceName", "Name", "name"]);
  const placeId = pickString(row, ["PlaceId", "placeId", "PlaceID"]);
  const lat = deepPickNumber(row, ["Latitude", "latitude", "Lat", "lat"]);
  const lng = deepPickNumber(row, ["Longitude", "longitude", "Lng", "lng", "Lon", "lon"]);
  if (!name && !placeId && lat == null && lng == null) return null;
  const address = asRecord(row.Address) ?? asRecord(row.address);
  return {
    placeId,
    name,
    category: pickString(row, ["CategoryName", "categoryName", "Category"]),
    address:
      pickString(row, ["AddressLine1", "addressLine1"]) ||
      (address ? pickString(address, ["AddressLine1", "addressLine1"]) : "") ||
      formatRevealAddress(row),
    city:
      pickString(row, ["Locality", "locality", "City", "city"]) ||
      (address ? pickString(address, ["Locality", "locality", "City"]) : ""),
    region:
      pickString(row, ["AdministrativeArea", "administrativeArea", "Region"]) ||
      (address ? pickString(address, ["AdministrativeArea", "administrativeArea"]) : ""),
    postalCode:
      pickString(row, ["PostalCode", "postalCode"]) ||
      (address ? pickString(address, ["PostalCode", "postalCode"]) : ""),
    country: pickString(row, ["Country", "country"]) || (address ? pickString(address, ["Country"]) : ""),
    lat: lat == null ? "" : String(lat),
    lng: lng == null ? "" : String(lng),
    shape: pickString(row, ["GeoShapeType", "geoShapeType", "Shape"]),
    phone: pickString(row, ["PhoneNumber", "phoneNumber", "Phone"]),
    note: pickString(row, ["Note", "note", "Notes"]),
  };
}

function placesFromPayload(json: unknown) {
  const rows = collectPlaceRecords(json);
  const source = rows.length > 0 ? rows : asList(json);
  const found: RevealPlace[] = [];
  const seen = new Set<string>();
  for (const row of source) {
    const place = parseRevealPlace(row);
    if (!place) continue;
    const key = locationKey(place.placeId || `${place.name}|${place.lat}|${place.lng}`);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    found.push(place);
  }
  return found;
}

function nextRevealPath(json: unknown, baseUrl: string) {
  const record = asRecord(json);
  const links = asRecord(record?._links) ?? asRecord(record?.links);
  if (!links) return "";
  const next = asRecord(links.next) ?? asRecord(links.Next);
  const href =
    (next ? pickString(next, ["href", "Href"]) : "") ||
    (typeof links.next === "string" ? links.next.trim() : "");
  if (!href) return "";
  try {
    const url = new URL(href, `${baseUrl}/`);
    return `${url.pathname}${url.search}`;
  } catch {
    return href.startsWith("/") ? href : "";
  }
}

export async function listRevealPlaces(
  organizationId: string,
  extraCategories: string[] = [],
): Promise<RevealPlace[]> {
  const creds = await loadRevealCreds(organizationId);
  if (!creds) throw new Error("Verizon Connect Reveal is not configured.");

  const found = new Map<string, RevealPlace>();
  const errors: string[] = [];
  const add = (places: RevealPlace[]) => {
    for (const place of places) {
      const key = locationKey(place.placeId || `${place.name}|${place.lat}|${place.lng}`);
      if (!key || found.has(key)) continue;
      found.set(key, place);
    }
  };

  const fetchPages = async (path: string) => {
    let next = path;
    for (let page = 0; page < 40 && next; page += 1) {
      const json = await revealFetch(creds, next);
      add(placesFromPayload(json));
      const following = nextRevealPath(json, creds.baseUrl);
      next = following && following !== next ? following : "";
    }
  };

  const tryPath = async (path: string) => {
    try {
      await fetchPages(path);
      return true;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      return false;
    }
  };

  await tryPath("/geo/v1/geofences");
  await tryPath("/geo/v1/geofences/");
  await tryPath("/geo/v1/geofences?categoryName=");
  await tryPath("/geo/v1/geofences?groupId=");
  for (const category of uniqueIds(extraCategories)) {
    await tryPath(`/geo/v1/geofences?categoryName=${encodeURIComponent(category)}`);
  }

  const groupIds: string[] = [];
  const groupNames: string[] = [];
  for (const path of ["/cmd/v1/groups", "/cmd/v1/vehiclegroups", "/gpm/v1/groups"] as const) {
    try {
      for (const group of asList(await revealFetch(creds, path))) {
        const row = flattenRevealItem(group);
        const groupId = pickString(row, ["GroupId", "groupId", "Id", "id", "GroupNumber", "groupNumber"]);
        const groupName = pickString(row, ["GroupName", "groupName", "Name", "name"]);
        if (groupId) groupIds.push(groupId);
        if (groupName) groupNames.push(groupName);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  for (const groupId of uniqueIds(groupIds)) {
    await tryPath(`/geo/v1/geofences?groupId=${encodeURIComponent(groupId)}`);
  }

  const categories = new Set(
    [
      ...[...found.values()].map((place) => place.category),
      ...groupNames,
      "Customer",
      "Customers",
      "Home",
      "Office",
      "Yard",
      "Shop",
      "Job Site",
      "Jobsite",
      "Unauthorized",
      "Authorized",
    ].filter(Boolean),
  );
  for (const path of [
    "/geo/v1/categories",
    "/geo/v1/geofences/categories",
    "/cmd/v1/geofencecategories",
    "/cmd/v1/placecategories",
  ] as const) {
    try {
      for (const row of asList(await revealFetch(creds, path))) {
        const name = pickString(flattenRevealItem(row), ["CategoryName", "categoryName", "Name", "name"]);
        if (name) categories.add(name);
      }
    } catch {
      // Category catalog endpoints are not on every account.
    }
  }
  for (const category of categories) {
    await tryPath(`/geo/v1/geofences?categoryName=${encodeURIComponent(category)}`);
  }

  if (found.size === 0) {
    const verizon = errors.find((line) => /\/geo\/v1\/geofences/.test(line)) || errors[0];
    throw new Error(
      verizon
        ? `Verizon returned no Places. Geofence GET needs a category (Places tab in Reveal) or group. Last error: ${verizon}`
        : "Verizon returned no Places. In Reveal, open Places and note a category name, then in Integration Manager Test Client run Geofence API GET /geofences with that categoryName.",
    );
  }

  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name) || a.placeId.localeCompare(b.placeId));
}

export function revealPlacesToCsv(places: RevealPlace[]) {
  const header = [
    "PlaceId",
    "Name",
    "Category",
    "Address",
    "City",
    "State",
    "PostalCode",
    "Country",
    "Latitude",
    "Longitude",
    "Shape",
    "Phone",
    "Note",
  ];
  const cell = (value: string) => {
    const text = value.replaceAll("\r\n", " ").replaceAll("\n", " ");
    if (/[",]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
    return text;
  };
  const lines = [
    header.join(","),
    ...places.map((place) =>
      [
        place.placeId,
        place.name,
        place.category,
        place.address,
        place.city,
        place.region,
        place.postalCode,
        place.country,
        place.lat,
        place.lng,
        place.shape,
        place.phone,
        place.note,
      ]
        .map(cell)
        .join(","),
    ),
  ];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function clearRevealTokenCache() {
  tokenCache.clear();
}
