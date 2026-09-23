import { cookies } from "next/headers";
import { appBaseUrl } from "./app-url";
import { readCompanyLogoFile } from "./company-logo";
import { prisma } from "./prisma";

export const LAST_ORG_COOKIE = "ag_org";

export type OrgBrand = {
  organizationId: string;
  name: string;
  hasLogo: boolean;
};

function toBrand(org: { id: string; name: string; logoMimeType: string | null }): OrgBrand {
  return { organizationId: org.id, name: org.name, hasLogo: Boolean(org.logoMimeType) };
}

export async function rememberLastOrg(organizationId: string) {
  const store = await cookies();
  store.set(LAST_ORG_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
}

export async function readLastOrgId() {
  const store = await cookies();
  const value = store.get(LAST_ORG_COOKIE)?.value?.trim();
  return value || null;
}

export async function resolveOrgBrandById(organizationId: string | null | undefined) {
  if (!organizationId) return null;
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true, logoMimeType: true },
  });
  return org ? toBrand(org) : null;
}

export async function resolveOrgBrandByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return null;
  const users = await prisma.user.findMany({
    where: { email: normalized },
    select: {
      organization: { select: { id: true, name: true, logoMimeType: true } },
    },
  });
  const unique = new Map(users.map((user) => [user.organization.id, user.organization]));
  if (unique.size !== 1) return null;
  const org = [...unique.values()][0];
  return toBrand(org);
}

export async function resolveSoleOrgBrand() {
  const count = await prisma.organization.count();
  if (count !== 1) return null;
  const org = await prisma.organization.findFirst({
    select: { id: true, name: true, logoMimeType: true },
  });
  return org ? toBrand(org) : null;
}

export async function resolveKnownLoginBrand(sessionOrgId?: string | null) {
  return (
    (await resolveOrgBrandById(sessionOrgId)) ||
    (await resolveOrgBrandById(await readLastOrgId())) ||
    (await resolveSoleOrgBrand())
  );
}

export function companyLogoSrc(organizationId: string) {
  return `/api/company-logo?org=${encodeURIComponent(organizationId)}`;
}

export function companyLogoEmailUrl(organizationId: string) {
  const base = appBaseUrl();
  return base ? `${base}${companyLogoSrc(organizationId)}` : "";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function tenantBrandEmailHtml(organizationId: string, organizationName: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { logoMimeType: true },
  });
  if (org?.logoMimeType) {
    const remote = companyLogoEmailUrl(organizationId);
    if (remote) {
      return `<p><img src="${remote}" alt="${escapeHtml(organizationName)}" width="220" style="max-width:220px;height:auto" /></p>`;
    }
    try {
      const bytes = await readCompanyLogoFile(organizationId);
      const src = `data:${org.logoMimeType};base64,${Buffer.from(bytes).toString("base64")}`;
      return `<p><img src="${src}" alt="${escapeHtml(organizationName)}" width="220" style="max-width:220px;height:auto" /></p>`;
    } catch {
      // fall through to the company name
    }
  }
  return `<p style="font-size:20px;font-weight:600;margin:0 0 16px">${escapeHtml(organizationName)}</p>`;
}
