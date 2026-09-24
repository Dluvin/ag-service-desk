import { prisma } from "./prisma";
import { ROLES } from "./roles";

export const PRESENCE_ONLINE_MS = 5 * 60 * 1000;

type ColumnInfo = { name: string };

let ensured: Promise<void> | null = null;

export async function ensurePresenceColumns() {
  if (!ensured) {
    ensured = (async () => {
      const cols = await prisma.$queryRawUnsafe<ColumnInfo[]>("PRAGMA table_info(User)");
      const names = new Set(cols.map((col) => col.name));
      if (!names.has("lastSeenAt")) {
        await prisma.$executeRawUnsafe("ALTER TABLE User ADD COLUMN lastSeenAt DATETIME");
      }
      if (!names.has("lastPath")) {
        await prisma.$executeRawUnsafe("ALTER TABLE User ADD COLUMN lastPath TEXT");
      }
      if (!names.has("lastLatitude")) {
        await prisma.$executeRawUnsafe("ALTER TABLE User ADD COLUMN lastLatitude REAL");
      }
      if (!names.has("lastLongitude")) {
        await prisma.$executeRawUnsafe("ALTER TABLE User ADD COLUMN lastLongitude REAL");
      }
    })();
  }
  await ensured;
}

export type StaffPresence = {
  id: string;
  name: string;
  email: string;
  role: string;
  storeName: string | null;
  lastSeenAt: Date | null;
  lastPath: string | null;
  lastLatitude: number | null;
  lastLongitude: number | null;
  online: boolean;
};

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseCoord(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clampCoord(value: number | null | undefined, maxAbs: number) {
  if (value == null || !Number.isFinite(value) || Math.abs(value) > maxAbs) return null;
  return value;
}

export function sanitizeDeskPath(path: string | null | undefined) {
  const raw = (path ?? "").trim();
  if (!raw.startsWith("/") || raw.includes("://") || raw.length > 200) return "/";
  return raw.split("#")[0] || "/";
}

export function describeDeskPath(path: string | null | undefined): string {
  if (!path) return "—";
  const clean = path.split("?")[0] || "/";
  if (clean === "/") return "Home";
  if (clean === "/dispatch") return "Dispatch";
  if (clean === "/dashboard") return "Dashboard";
  if (clean === "/tickets") return "Work orders";
  if (clean.startsWith("/tickets/")) return "A work order";
  if (clean === "/map") return "Work order map";
  if (clean === "/startup") return "Maintenance";
  if (clean.startsWith("/startup/")) return "Maintenance";
  if (clean === "/parts") return "Parts";
  if (clean === "/labor") return "Labor";
  if (clean === "/equipment") return "Equipment";
  if (clean === "/assets") return "Assets";
  if (clean.startsWith("/assets/")) return "An asset";
  if (clean === "/reports") return "Work order reports";
  if (clean.startsWith("/reports/pivots")) return "Pivot reports";
  if (clean.startsWith("/reports/customers")) return "Customer reports";
  if (clean.startsWith("/reports/farms")) return "Farm reports";
  if (clean.startsWith("/reports/assets")) return "Asset reports";
  if (clean === "/farmers") return "Customers";
  if (clean.startsWith("/farmers/")) return "A customer";
  if (clean === "/farms") return "Farms";
  if (clean.startsWith("/farms/")) return "A farm";
  if (clean === "/staff") return "Staff";
  if (clean === "/technicians") return "Technicians";
  if (clean === "/managers") return "Managers";
  if (clean === "/stores") return "Stores";
  if (clean === "/company") return "Logo";
  if (clean === "/settings") return "Desk settings";
  if (clean === "/sms") return "SMS";
  if (clean === "/reveal") return "Connectors";
  if (clean === "/vehicles") return "Vehicles";
  if (clean === "/online") return "Who’s signed in";
  if (clean === "/help" || clean.startsWith("/help/")) return "Support";
  if (clean.startsWith("/pivots/")) return "A pivot";
  return clean;
}

export function isPresenceOnline(lastSeenAt: Date | null, now = Date.now()) {
  return Boolean(lastSeenAt && now - lastSeenAt.getTime() <= PRESENCE_ONLINE_MS);
}

export function formatPresenceTime(lastSeenAt: Date | null, now = Date.now()) {
  if (!lastSeenAt) return "Never";
  const delta = Math.max(0, now - lastSeenAt.getTime());
  if (delta < 45_000) return "Just now";
  if (delta < 60_000) return "Less than a minute ago";
  if (delta < 60 * 60_000) {
    const minutes = Math.round(delta / 60_000);
    return `${minutes} min ago`;
  }
  if (delta < 24 * 60 * 60_000) {
    const hours = Math.round(delta / 3_600_000);
    return `${hours} hr ago`;
  }
  return lastSeenAt.toLocaleString();
}

export async function recordStaffPresence(input: {
  userId: string;
  path?: string;
  latitude?: number | null;
  longitude?: number | null;
}) {
  await ensurePresenceColumns();
  const path = sanitizeDeskPath(input.path);
  const lat = clampCoord(input.latitude, 90);
  const lng = clampCoord(input.longitude, 180);
  const now = new Date().toISOString();
  if (lat != null && lng != null) {
    await prisma.$executeRaw`
      UPDATE User
      SET lastSeenAt = ${now}, lastPath = ${path}, lastLatitude = ${lat}, lastLongitude = ${lng}
      WHERE id = ${input.userId}
    `;
    return;
  }
  await prisma.$executeRaw`
    UPDATE User SET lastSeenAt = ${now}, lastPath = ${path} WHERE id = ${input.userId}
  `;
}

export async function listStaffPresence(organizationId: string): Promise<StaffPresence[]> {
  await ensurePresenceColumns();
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      storeName: string | null;
      lastSeenAt: unknown;
      lastPath: string | null;
      lastLatitude: unknown;
      lastLongitude: unknown;
    }>
  >`
    SELECT
      u.id,
      u.name,
      u.email,
      u.role,
      s.name as storeName,
      u.lastSeenAt,
      u.lastPath,
      u.lastLatitude,
      u.lastLongitude
    FROM User u
    LEFT JOIN Store s ON s.id = u.storeId
    WHERE u.organizationId = ${organizationId}
      AND u.role <> ${ROLES.FARMER}
    ORDER BY u.name COLLATE NOCASE ASC
  `;
  const now = Date.now();
  return rows.map((row) => {
    const lastSeenAt = parseDate(row.lastSeenAt);
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      storeName: row.storeName,
      lastSeenAt,
      lastPath: row.lastPath,
      lastLatitude: parseCoord(row.lastLatitude),
      lastLongitude: parseCoord(row.lastLongitude),
      online: isPresenceOnline(lastSeenAt, now),
    };
  });
}
