import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { FIELD_TECH_ROLES, ROLES, canAddTechnicians } from "./roles";
import { assertCanAddStaff } from "./org-plan";
import { hashNewUserPassword, sendWelcomeLoginEmail } from "./welcome-mail";

export const HELPER_NONE = "__none__";
export const HELPER_NEW = "__new__";

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function uniqueEmailError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "That email is already in use.";
  }
  return null;
}

async function resolveStoreId(organizationId: string, storeId: string) {
  if (!storeId) return null;
  const store = await prisma.store.findFirst({ where: { id: storeId, organizationId } });
  return store?.id ?? null;
}

export async function resolveTicketHelper(input: {
  organizationId: string;
  organizationName: string;
  actorRole: string;
  leadTechnicianId: string | null;
  formData: FormData;
}): Promise<{ helperTechnicianId: string | null } | { error: string }> {
  const { organizationId, organizationName, actorRole, leadTechnicianId, formData } = input;
  if (!leadTechnicianId) return { helperTechnicianId: null };

  const raw = formString(formData, "helperTechnicianId");
  if (!raw) return { error: "Choose a technician helper, or None." };
  if (raw === HELPER_NONE) return { helperTechnicianId: null };

  if (raw === HELPER_NEW) {
    if (!canAddTechnicians(actorRole)) {
      return { error: "Only managers and admins can add technicians." };
    }
    const name = formString(formData, "helperName");
    const email = formString(formData, "helperEmail").toLowerCase();
    const phone = formString(formData, "helperPhone");
    const password = formString(formData, "helperPassword");
    if (!name || !email) return { error: "Helper name and email are required to add a new technician." };
    if (password && password.length < 8) {
      return { error: "Helper password must be at least 8 characters, or leave it blank." };
    }
    const seat = await assertCanAddStaff(organizationId);
    if ("error" in seat && seat.error) return { error: seat.error };

    const { hash, hadPassword } = await hashNewUserPassword(password);
    let user;
    try {
      user = await prisma.user.create({
        data: {
          organizationId,
          name,
          email,
          role: ROLES.TECHNICIAN,
          passwordHash: hash,
          phone: phone || null,
          storeId: await resolveStoreId(organizationId, formString(formData, "storeId")),
        },
      });
    } catch (error) {
      return { error: uniqueEmailError(error) ?? "Could not save that helper technician." };
    }
    try {
      await sendWelcomeLoginEmail({
        userId: user.id,
        email: user.email,
        name: user.name,
        organizationName,
        hadPassword,
      });
    } catch {
      // Welcome mail is best-effort; the helper is still usable.
    }
    if (user.id === leadTechnicianId) {
      return { error: "Helper must be different from the lead technician." };
    }
    return { helperTechnicianId: user.id };
  }

  if (raw === leadTechnicianId) {
    return { error: "Helper must be different from the lead technician." };
  }
  const user = await prisma.user.findFirst({
    where: { id: raw, organizationId, role: { in: [...FIELD_TECH_ROLES] } },
    select: { id: true },
  });
  if (!user) return { error: "Helper technician not found." };
  return { helperTechnicianId: user.id };
}
