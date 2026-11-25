import type { Role } from "@/lib/roles";
import { ROLES } from "@/lib/roles";
import { t, type Locale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";

export function ticketWhere(session: SessionUser) {
  if (session.role === ROLES.FARMER) {
    return { organizationId: session.organizationId, farmerId: session.farmerId ?? "__none__" };
  }
  if (session.role === ROLES.TECHNICIAN) {
    // Staff technicians only see WOs where they are lead (legacy) or helper under a lead.
    return {
      organizationId: session.organizationId,
      OR: [
        { technicianId: session.userId },
        { helperTechnicianId: session.userId },
        { helperTechnicianIds: { contains: `"${session.userId}"` } },
      ],
    };
  }
  return { organizationId: session.organizationId };
}

export function pivotWhere(session: SessionUser) {
  if (session.role === ROLES.FARMER) {
    return { organizationId: session.organizationId, farmerId: session.farmerId ?? "__none__" };
  }
  return { organizationId: session.organizationId };
}

export function farmerWhere(session: SessionUser) {
  if (session.role === ROLES.FARMER) {
    return { organizationId: session.organizationId, id: session.farmerId ?? "__none__" };
  }
  return { organizationId: session.organizationId };
}

export function farmWhere(session: SessionUser) {
  return pivotWhere(session);
}

export function assetWhere(session: SessionUser) {
  return pivotWhere(session);
}

export async function loadTechnicians(organizationId: string) {
  return prisma.user.findMany({
    where: { organizationId, role: { in: [ROLES.TECH_LEAD, ROLES.TECHNICIAN] } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, role: true, email: true, phone: true, storeId: true },
  });
}

/** Lead technician on a work order must be TECH_LEAD (not a staff/helper technician). */
export async function assertLeadTechnicianId(organizationId: string, technicianId: string | null) {
  if (!technicianId) return { technicianId: null as string | null };
  const user = await prisma.user.findFirst({
    where: { id: technicianId, organizationId, role: ROLES.TECH_LEAD },
    select: { id: true },
  });
  if (!user) {
    return {
      error:
        "Only Lead Technicians can be assigned as the lead on a work order. Staff Technicians must be helpers under a Lead Technician.",
    };
  }
  return { technicianId: user.id };
}

export function isAssignedFieldTech(
  ticket: {
    technicianId: string | null;
    helperTechnicianId?: string | null;
    helperTechnicianIds?: string | null;
  },
  userId: string,
) {
  if (ticket.technicianId === userId) return true;
  if (ticket.helperTechnicianId === userId) return true;
  const raw = ticket.helperTechnicianIds;
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) && parsed.map(String).includes(userId);
  } catch {
    return raw.includes(`"${userId}"`);
  }
}

export function roleLabel(role: Role | string, locale: Locale = "en") {
  if (role === ROLES.ADMIN) return t(locale, "role.ADMIN");
  if (role === ROLES.MANAGER) return t(locale, "role.MANAGER");
  if (role === ROLES.SALESPERSON) return t(locale, "role.SALESPERSON");
  if (role === ROLES.TECH_LEAD) return t(locale, "role.TECH_LEAD");
  if (role === ROLES.CLERICAL) return t(locale, "role.CLERICAL");
  if (role === ROLES.TECHNICIAN) return t(locale, "role.TECHNICIAN");
  return t(locale, "role.FARMER");
}
