import { prisma } from "./prisma";
import { SHOP_STAFF_ROLES } from "./roles";
import {
  PLAN_ORG_SELECT,
  canAddStore,
  canAddUser,
  contactSalesStoreMessage,
  contactSalesUserMessage,
  resolveEntitlements,
  type PlanOrg,
  type ResolvedPlan,
} from "./plans";

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

export async function shopStaffCount(organizationId: string) {
  return prisma.user.count({
    where: {
      organizationId,
      role: { in: [...SHOP_STAFF_ROLES] },
    },
  });
}

export async function assertCanAddStaff(organizationId: string, adding = 1) {
  const loaded = await loadOrgPlan(organizationId);
  if (!loaded) return { error: "Company not found." };
  const count = await shopStaffCount(organizationId);
  if (!canAddUser(loaded.org, count, adding)) {
    return { error: contactSalesUserMessage(loaded.org) };
  }
  return { org: loaded.org, entitlements: loaded.entitlements, count };
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
