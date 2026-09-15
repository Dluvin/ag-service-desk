import { ROLES, type Role } from "@/lib/roles";
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

export async function loadTechnicians(organizationId: string) {
  return prisma.user.findMany({
    where: { organizationId, role: ROLES.TECHNICIAN },
    orderBy: { name: "asc" },
  });
}

export function roleLabel(role: Role | string) {
  if (role === ROLES.ADMIN) return "Company admin";
  if (role === ROLES.MANAGER) return "Manager";
  if (role === ROLES.TECHNICIAN) return "Technician";
  return "Farmer";
}
