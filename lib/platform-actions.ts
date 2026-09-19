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
