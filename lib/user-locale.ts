import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { parseLocale, type Locale } from "./i18n";
import { getSession } from "./auth";

export const LOCALE_COOKIE = "ag_locale";

type ColumnInfo = { name: string };

let ensured: Promise<void> | null = null;

export async function ensureLocaleColumn() {
  if (!ensured) {
    ensured = (async () => {
      const cols = await prisma.$queryRawUnsafe<ColumnInfo[]>("PRAGMA table_info(User)");
      const names = new Set(cols.map((col) => col.name));
      if (!names.has("locale")) {
        await prisma.$executeRawUnsafe("ALTER TABLE User ADD COLUMN locale TEXT NOT NULL DEFAULT 'en'");
      }
    })();
  }
  await ensured;
}

export async function readLocaleCookie(): Promise<Locale> {
  const store = await cookies();
  return parseLocale(store.get(LOCALE_COOKIE)?.value);
}

export async function writeLocaleCookie(locale: Locale) {
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function loadUserLocale(userId: string): Promise<Locale> {
  await ensureLocaleColumn();
  const rows = await prisma.$queryRaw<Array<{ locale: string | null }>>`
    SELECT locale FROM User WHERE id = ${userId}
  `;
  return parseLocale(rows[0]?.locale);
}

export async function saveUserLocale(userId: string, locale: Locale) {
  await ensureLocaleColumn();
  await prisma.$executeRaw`UPDATE User SET locale = ${locale} WHERE id = ${userId}`;
}

export async function loadOrgLocales(organizationId: string): Promise<Map<string, Locale>> {
  await ensureLocaleColumn();
  const rows = await prisma.$queryRaw<Array<{ id: string; locale: string | null }>>`
    SELECT id, locale FROM User WHERE organizationId = ${organizationId}
  `;
  return new Map(rows.map((row) => [row.id, parseLocale(row.locale)]));
}

export async function getRequestLocale(): Promise<Locale> {
  const session = await getSession();
  if (session) return loadUserLocale(session.userId);
  return readLocaleCookie();
}

export function safeNextPath(raw: string | null | undefined, fallback = "/") {
  const value = (raw ?? "").trim();
  if (!value.startsWith("/") || value.includes("://") || value.length > 200) return fallback;
  return value.split("#")[0] || fallback;
}
