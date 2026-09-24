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
    return { organizationId: session.organizationId, technicianId: session.userId };
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
    where: { organizationId, role: ROLES.TECHNICIAN },
    orderBy: { name: "asc" },
  });
}

export function roleLabel(role: Role | string, locale: Locale = "en") {
  if (role === ROLES.ADMIN) return t(locale, "role.ADMIN");
  if (role === ROLES.MANAGER) return t(locale, "role.MANAGER");
  if (role === ROLES.CLERICAL) return t(locale, "role.CLERICAL");
  if (role === ROLES.TECHNICIAN) return t(locale, "role.TECHNICIAN");
  return t(locale, "role.FARMER");
}
