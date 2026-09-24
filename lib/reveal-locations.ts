import type { PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";
import type { RevealLocation } from "./reveal";

type ColumnInfo = { name: string };

type StoredRow = {
  number: string;
  name: string;
  lastLatitude: unknown;
  lastLongitude: unknown;
  lastAddress: unknown;
  displayState: unknown;
  locationUpdatedAt: unknown;
};

let ensured: Promise<void> | null = null;

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function asIso(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export async function ensureRevealVehicleLocationColumns(db: PrismaClient = prisma) {
  if (!ensured) {
    ensured = (async () => {
      const cols = (await db.$queryRawUnsafe("PRAGMA table_info(RevealVehicle)")) as ColumnInfo[];
      const names = new Set(cols.map((col) => col.name));
      if (!names.has("lastLatitude")) {
        await db.$executeRawUnsafe("ALTER TABLE RevealVehicle ADD COLUMN lastLatitude REAL");
      }
      if (!names.has("lastLongitude")) {
        await db.$executeRawUnsafe("ALTER TABLE RevealVehicle ADD COLUMN lastLongitude REAL");
      }
      if (!names.has("lastAddress")) {
        await db.$executeRawUnsafe("ALTER TABLE RevealVehicle ADD COLUMN lastAddress TEXT");
      }
      if (!names.has("displayState")) {
        await db.$executeRawUnsafe("ALTER TABLE RevealVehicle ADD COLUMN displayState TEXT");
      }
      if (!names.has("locationUpdatedAt")) {
        await db.$executeRawUnsafe("ALTER TABLE RevealVehicle ADD COLUMN locationUpdatedAt DATETIME");
      }
    })();
  }
  await ensured;
}

export async function loadStoredRevealLocations(
  organizationId: string,
  db: PrismaClient = prisma,
): Promise<RevealLocation[]> {
  await ensureRevealVehicleLocationColumns(db);
  const rows = (await db.$queryRaw`
    SELECT number, name, lastLatitude, lastLongitude, lastAddress, displayState, locationUpdatedAt
    FROM RevealVehicle
    WHERE organizationId = ${organizationId}
      AND active = 1
      AND lastLatitude IS NOT NULL
      AND lastLongitude IS NOT NULL
  `) as StoredRow[];

  return rows.flatMap((row) => {
    const lat = asNumber(row.lastLatitude);
    const lng = asNumber(row.lastLongitude);
    if (lat == null || lng == null) return [];
    return [
      {
        vehicleNumber: String(row.number),
        name: asText(row.name),
        lat,
        lng,
        address: asText(row.lastAddress),
        displayState: asText(row.displayState),
        updatedAt: asIso(row.locationUpdatedAt),
      },
    ];
  });
}

export function withDemoRevealMotion(locations: RevealLocation[]): RevealLocation[] {
  const minutes = Date.now() / 60_000;
  return locations.map((location) => {
    const parked = /stop|idle|on.?site/i.test(location.displayState ?? "");
    if (parked) {
      return { ...location, updatedAt: location.updatedAt ?? new Date().toISOString() };
    }
    const seed = Number.parseInt(location.vehicleNumber, 10);
    const n = Number.isFinite(seed) ? seed : location.vehicleNumber.charCodeAt(0);
    return {
      ...location,
      lat: location.lat + Math.sin(minutes / 2.4 + n) * 0.006,
      lng: location.lng + Math.cos(minutes / 3.1 + n) * 0.008,
      updatedAt: new Date().toISOString(),
    };
  });
}
