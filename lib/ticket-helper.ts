import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { FIELD_TECH_ROLES, ROLES, canAddTechnicians } from "./roles";
import { assertCanAddStaff } from "./org-plan";
import { hashNewUserPassword, sendWelcomeLoginEmail } from "./welcome-mail";
import { HELPER_NEW, HELPER_NONE } from "./ticket-helper-constants";

export { HELPER_NEW, HELPER_NONE };

export function parseHelperTechnicianIds(
  raw: string | null | undefined,
  legacyId?: string | null,
): string[] {
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return [...new Set(parsed.map((id) => String(id || "").trim()).filter(Boolean))];
      }
    } catch {
      // fall through
    }
  }
  return legacyId ? [legacyId] : [];
}

export function serializeHelperTechnicianIds(ids: string[]): string | null {
  const unique = [...new Set(ids.map((id) => String(id || "").trim()).filter(Boolean))];
  return unique.length ? JSON.stringify(unique) : null;
}

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

async function createHelperTechnician(input: {
  organizationId: string;
  organizationName: string;
  actorRole: string;
  formData: FormData;
}): Promise<{ id: string } | { error: string }> {
  if (!canAddTechnicians(input.actorRole)) {
    return { error: "Only managers and admins can add technicians." };
  }
  const name = formString(input.formData, "helperName");
  const email = formString(input.formData, "helperEmail").toLowerCase();
  const phone = formString(input.formData, "helperPhone");
  const password = formString(input.formData, "helperPassword");
  if (!name || !email) return { error: "Helper name and email are required to add a new technician." };
  if (password && password.length < 8) {
    return { error: "Helper password must be at least 8 characters, or leave it blank." };
  }
  const seat = await assertCanAddStaff(input.organizationId);
  if ("error" in seat && seat.error) return { error: seat.error };

  const { hash, hadPassword } = await hashNewUserPassword(password);
  let user;
  try {
    user = await prisma.user.create({
      data: {
        organizationId: input.organizationId,
        name,
        email,
        role: ROLES.TECHNICIAN,
        passwordHash: hash,
        phone: phone || null,
        storeId: await resolveStoreId(input.organizationId, formString(input.formData, "storeId")),
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
      organizationName: input.organizationName,
      hadPassword,
    });
  } catch {
    // Welcome mail is best-effort; the helper is still usable.
  }
  return { id: user.id };
}

export type ResolvedHelpers = {
  helperTechnicianId: string | null;
  helperTechnicianIds: string[];
};

export async function resolveTicketHelper(input: {
  organizationId: string;
  organizationName: string;
  actorRole: string;
  leadTechnicianId: string | null;
  formData: FormData;
}): Promise<ResolvedHelpers | { error: string }> {
  const { organizationId, organizationName, actorRole, leadTechnicianId, formData } = input;
  if (!leadTechnicianId) {
    return { helperTechnicianId: null, helperTechnicianIds: [] };
  }

  const rawValues = formData
    .getAll("helperTechnicianIds")
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
  // Backward compatible single-field posts
  if (!rawValues.length) {
    const legacy = formString(formData, "helperTechnicianId");
    if (legacy) rawValues.push(legacy);
  }

  if (!rawValues.length) {
    return { error: "Choose at least one technician helper, or None." };
  }
  if (rawValues.includes(HELPER_NONE)) {
    if (rawValues.length > 1) {
      return { error: "Choose None alone, or select one or more helpers." };
    }
    return { helperTechnicianId: null, helperTechnicianIds: [] };
  }

  const ids: string[] = [];
  for (const raw of rawValues) {
    if (raw === HELPER_NEW) {
      const created = await createHelperTechnician({
        organizationId,
        organizationName,
        actorRole,
        formData,
      });
      if ("error" in created) return created;
      if (created.id === leadTechnicianId) {
        return { error: "Helper must be different from the lead technician." };
      }
      ids.push(created.id);
      continue;
    }
    if (raw === leadTechnicianId) {
      return { error: "Helper must be different from the lead technician." };
    }
    const user = await prisma.user.findFirst({
      where: { id: raw, organizationId, role: { in: [...FIELD_TECH_ROLES] } },
      select: { id: true },
    });
    if (!user) return { error: "Helper technician not found." };
    ids.push(user.id);
  }

  const unique = [...new Set(ids)];
  if (!unique.length) return { error: "Choose at least one technician helper, or None." };
  return {
    helperTechnicianId: unique[0] ?? null,
    helperTechnicianIds: unique,
  };
}
