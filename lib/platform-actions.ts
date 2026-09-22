"use server";

import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { ROLES, type Role } from "./roles";
import { createSession, destroySession } from "./auth";
import {
  createPlatformSession,
  destroyPlatformSession,
  getPlatformSession,
  requirePlatformAdmin,
  verifyPlatformLogin,
} from "./platform";
import { removeCompanyLogoFile } from "./company-logo";
import { PLAN } from "./plan";
import { isGpsProvider, isPlanId, orgFieldsForPlan } from "./plans";
import { seedApprovedDemo } from "./demo-tenant";
import { startTenantBilling, stripeIsConfigured } from "./stripe";
import { emailTenantApproved } from "./signup-notify";

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function platformLoginAction(formData: FormData) {
  const email = formString(formData, "email");
  const password = formString(formData, "password");
  const admin = await verifyPlatformLogin(email, password);
  if (!admin) return { error: "Invalid platform email or password." };
  await createPlatformSession(admin);
  redirect("/platform");
}

export async function platformLogoutAction() {
  await destroyPlatformSession();
  await destroySession();
  redirect("/platform/login");
}

export async function impersonateTenantAction(formData: FormData) {
  const platform = await requirePlatformAdmin();
  const organizationId = formString(formData, "organizationId");
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      users: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!org) return { error: "Company not found." };
  const admin =
    org.users.find((user) => user.role === ROLES.ADMIN) ?? org.users[0];
  if (!admin) return { error: "This company has no staff login to open." };
  await createSession({
    userId: admin.id,
    organizationId: org.id,
    organizationName: org.name,
    role: admin.role as Role,
    farmerId: admin.farmerId,
    name: admin.name,
    email: admin.email,
    impersonatorId: platform.adminId,
  });
  redirect("/dashboard");
}

export async function stopImpersonatingAction() {
  const platform = await getPlatformSession();
  await destroySession();
  if (!platform) redirect("/platform/login");
  redirect("/platform");
}

export async function pauseTenantAction(formData: FormData) {
  await requirePlatformAdmin();
  const organizationId = formString(formData, "organizationId");
  const paused = formString(formData, "paused") === "1";
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) return { error: "Company not found." };
  await prisma.organization.update({
    where: { id: organizationId },
    data: { paused },
  });
  redirect("/platform");
}

export async function deleteTenantAction(formData: FormData) {
  await requirePlatformAdmin();
  const organizationId = formString(formData, "organizationId");
  const confirmName = formString(formData, "confirmName");
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) return { error: "Company not found." };
  if (confirmName !== org.name) {
    return { error: `Type ${org.name} exactly to delete this company.` };
  }
  await removeCompanyLogoFile(org.id);
  await prisma.organization.delete({ where: { id: org.id } });
  redirect("/platform");
}

export async function approveTenantAction(formData: FormData) {
  await requirePlatformAdmin();
  const organizationId = formString(formData, "organizationId");
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { users: { where: { role: ROLES.ADMIN }, orderBy: { createdAt: "asc" }, take: 1 } },
  });
  if (!org) return { error: "Company not found." };
  const admin = org.users[0];
  const trialEndsAt = new Date(Date.now() + PLAN.trialDays * 24 * 60 * 60 * 1000);
  await prisma.organization.update({
    where: { id: org.id },
    data: { paused: false, signupStatus: "ACTIVE", trialEndsAt },
  });
  if (admin) {
    try {
      await seedApprovedDemo(org.id, admin.id);
    } catch (error) {
      console.error("Demo seed failed", error);
    }
  }

  let checkoutUrl = "";
  if (stripeIsConfigured()) {
    try {
      const billing = await startTenantBilling(org.id);
      checkoutUrl = billing.checkoutUrl;
    } catch (error) {
      console.error("Stripe billing setup failed", error);
    }
  }
  if (admin) {
    await emailTenantApproved({
      to: admin.email,
      name: admin.name,
      company: org.name,
      checkoutUrl,
    });
  }
  redirect("/platform");
}

export async function rejectTenantAction(formData: FormData) {
  await requirePlatformAdmin();
  const organizationId = formString(formData, "organizationId");
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) return { error: "Company not found." };
  await prisma.organization.update({
    where: { id: org.id },
    data: { paused: true, signupStatus: "REJECTED" },
  });
  redirect("/platform");
}

export async function createBillingCheckoutAction(formData: FormData) {
  await requirePlatformAdmin();
  const organizationId = formString(formData, "organizationId");
  if (!stripeIsConfigured()) {
    return {
      error:
        "Stripe is not configured on Render. Set STRIPE_SECRET_KEY and STRIPE_PRICE_BASE, then try again.",
    };
  }
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { users: { where: { role: ROLES.ADMIN }, orderBy: { createdAt: "asc" }, take: 1 } },
  });
  if (!org) return { error: "Company not found." };
  const admin = org.users[0];
  let checkoutUrl = "";
  try {
    const billing = await startTenantBilling(organizationId);
    checkoutUrl = billing.checkoutUrl;
    if (billing.error || !checkoutUrl) {
      return { error: billing.error || "Stripe did not return a checkout URL." };
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Stripe checkout failed." };
  }
  if (admin) {
    await emailTenantApproved({
      to: admin.email,
      name: admin.name,
      company: org.name,
      checkoutUrl,
    });
  }
  redirect("/platform");
}

export async function updateTenantPlanAction(formData: FormData) {
  await requirePlatformAdmin();
  const organizationId = formString(formData, "organizationId");
  const plan = formString(formData, "plan");
  if (!isPlanId(plan)) return { error: "Choose Starter, Shop, or Enterprise." };

  const gpsProviderRaw = formString(formData, "gpsProvider");
  const gpsProvider = isGpsProvider(gpsProviderRaw) ? gpsProviderRaw : undefined;
  const maxStoresRaw = formString(formData, "maxStores");
  const includedUsersRaw = formString(formData, "includedUsers");
  const maxStoresOverride = maxStoresRaw === "" ? null : Number(maxStoresRaw);
  const includedUsersOverride = includedUsersRaw === "" ? null : Number(includedUsersRaw);
  if (maxStoresRaw !== "" && (!Number.isInteger(maxStoresOverride) || (maxStoresOverride ?? 0) < 0)) {
    return { error: "Store cap must be a whole number, or leave blank for the plan default." };
  }
  if (includedUsersRaw !== "" && (!Number.isInteger(includedUsersOverride) || (includedUsersOverride ?? 0) < 1)) {
    return { error: "Included seats must be a whole number, or leave blank for the plan default." };
  }

  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) return { error: "Company not found." };

  await prisma.organization.update({
    where: { id: org.id },
    data: orgFieldsForPlan({
      plan,
      revealGps: formString(formData, "revealGps") === "1",
      gpsProvider,
      maxStoresOverride,
      includedUsersOverride,
    }),
  });
  redirect("/platform");
}
