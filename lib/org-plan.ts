import { prisma } from "./prisma";
import { SHOP_STAFF_ROLES } from "./roles";
import {
  PLAN_ORG_SELECT,
  canAddStore,
  contactSalesStoreMessage,
  contactSalesUserMessage,
  resolveEntitlements,
  type PlanOrg,
  type ResolvedPlan,
} from "./plans";
import { billableStaffCount, staffSeatBreakdown, type StaffSeatUser } from "./staff-seats";

export async function loadOrgPlan(organizationId: string): Promise<{
  org: PlanOrg;
  entitlements: ResolvedPlan;
} | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: PLAN_ORG_SELECT,
  });
  if (!org) return null;
  return { org, entitlements: resolveEntitlements(org) };
}

export async function shopStaffUsers(organizationId: string): Promise<StaffSeatUser[]> {
  return prisma.user.findMany({
    where: {
      organizationId,
      role: { in: [...SHOP_STAFF_ROLES] },
    },
    select: { role: true },
  });
}

export async function shopStaffCount(organizationId: string) {
  return prisma.user.count({
    where: {
      organizationId,
      role: { in: [...SHOP_STAFF_ROLES] },
    },
  });
}

export async function shopBillableStaffCount(organizationId: string) {
  return billableStaffCount(await shopStaffUsers(organizationId));
}

/**
 * Seat check with free helpers: each Lead Technician includes 3 Staff Technicians.
 * Pass `role` when adding someone so free-helper slots are applied correctly.
 */
export async function assertCanAddStaff(organizationId: string, adding = 1, role?: string) {
  const loaded = await loadOrgPlan(organizationId);
  if (!loaded) return { error: "Company not found." };
  const users = await shopStaffUsers(organizationId);
  const projected =
    role && adding > 0
      ? billableStaffCount([...users, ...Array.from({ length: adding }, () => ({ role }))])
      : billableStaffCount(users) + Math.max(0, adding);
  const max = loaded.entitlements.maxUsers;
  if (max != null && projected > max) {
    return { error: contactSalesUserMessage(loaded.org) };
  }
  return {
    org: loaded.org,
    entitlements: loaded.entitlements,
    count: users.length,
    billable: billableStaffCount(users),
    seats: staffSeatBreakdown(users),
  };
}

export async function assertCanAddStore(organizationId: string, adding = 1) {
  const loaded = await loadOrgPlan(organizationId);
  if (!loaded) return { error: "Company not found." };
  const count = await prisma.store.count({ where: { organizationId } });
  if (!canAddStore(loaded.org, count, adding)) {
    return { error: contactSalesStoreMessage(loaded.org) };
  }
  return { org: loaded.org, entitlements: loaded.entitlements, count };
}
