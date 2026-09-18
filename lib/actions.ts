"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { createSession, destroySession, getSession, requireSession, verifyLogin } from "./auth";
import {
  PRIORITIES,
  ROLES,
  TICKET_STATUSES,
  isAdmin,
  canAddTechnicians,
  canAssignTickets,
  canDeleteRecords,
  canImportPivots,
  canImportStaff,
  canEditStartupChecklist,
  isFinishedStatus,
  isShopStaff,
  requiresInvoice,
  slugify,
  type TicketStatus,
} from "./roles";
import { openServiceTicket } from "./tickets";
import { INSPECTION_STATUS, STARTUP_CHECKS, STARTUP_SEASON_YEAR, checkLabel, ensureStartupTemplates, uniqueCheckKey } from "./startup";
import { parseMapsLocation } from "./maps";
import { parseAgSenseExport } from "./agsense";
import { importCatalogPartBatch } from "./catalog-import";
import { parseStaffImport, isShopStaffRole } from "./staff-import";
import { closeOpenSiteVisits } from "./onsite";
import { REVEAL_EU, REVEAL_US, clearRevealTokenCache, listRevealVehicles } from "./reveal";
import { notifyTicketSms } from "./ticket-sms";
import { sendBirdSms, toE164 } from "./bird";
import { saveTicketPhotos, photoFilesFromForm, validatePhotoFiles } from "./ticket-photos";
import { saveCompanyLogoFile, removeCompanyLogoFile } from "./company-logo";
import { parseDateTimeLocal } from "./schedule";
import { parseMoneyInput } from "./money";

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function createFarmWithContact(
  organizationId: string,
  input: {
    name: string;
    address?: string;
    contactName?: string;
    phone?: string;
    email?: string;
    storeId?: string | null;
  },
) {
  const contactName = input.contactName || input.name;
  const phone = input.phone || null;
  const email = input.email || null;
  return prisma.farmer.create({
    data: {
      organizationId,
      storeId: input.storeId || null,
      name: input.name,
      phone,
      email,
      address: input.address || null,
      contacts: {
        create: {
          name: contactName,
          phone,
          email,
        },
      },
    },
  });
}

async function resolveStoreId(organizationId: string, storeId: string) {
  if (!storeId) return null;
  const store = await prisma.store.findFirst({ where: { id: storeId, organizationId } });
  return store?.id ?? null;
}

export async function loginAction(formData: FormData) {
  const email = formString(formData, "email");
  const password = formString(formData, "password");
  const user = await verifyLogin(email, password);
  if (!user) return { error: "Invalid email or password." };
  await createSession(user);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function signupAction(formData: FormData) {
  const company = formString(formData, "company");
  const name = formString(formData, "name");
  const email = formString(formData, "email").toLowerCase();
  const password = formString(formData, "password");
  if (!company || !name || !email || password.length < 8) {
    return { error: "Company, name, email, and an 8+ character password are required." };
  }

  let slug = slugify(company) || "company";
  const existing = await prisma.organization.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const organization = await prisma.organization.create({
    data: {
      name: company,
      slug,
      users: {
        create: {
          name,
          email,
          role: ROLES.ADMIN,
          passwordHash: await bcrypt.hash(password, 10),
        },
      },
      startupChecks: {
        create: STARTUP_CHECKS.map((check, index) => ({
          checkKey: check.key,
          label: check.label,
          detail: check.detail,
          sortOrder: index,
        })),
      },
    },
    include: { users: true },
  });

  const admin = organization.users[0];
  await createSession({
    userId: admin.id,
    organizationId: organization.id,
    organizationName: organization.name,
    role: ROLES.ADMIN,
    farmerId: null,
    name: admin.name,
    email: admin.email,
  });
  redirect("/dashboard");
}

export async function createFarmerAction(formData: FormData) {
  const session = await requireSession();
  if (session.role === ROLES.FARMER) return { error: "Ask the service company to add a farm." };

  const name = formString(formData, "name");
  const phone = formString(formData, "phone");
  const email = formString(formData, "email").toLowerCase();
  const address = formString(formData, "address");
  const loginEmail = formString(formData, "loginEmail").toLowerCase();
  const loginPassword = formString(formData, "loginPassword");
  if (!name) return { error: "Farm name is required." };

  const farmer = await createFarmWithContact(session.organizationId, {
    name,
    address,
    contactName: formString(formData, "contactName"),
    phone: formString(formData, "contactPhone") || phone,
    email: formString(formData, "contactEmail").toLowerCase() || email,
    storeId: await resolveStoreId(session.organizationId, formString(formData, "storeId")),
  });

  if (loginEmail && loginPassword.length >= 8) {
    await prisma.user.create({
      data: {
        organizationId: session.organizationId,
        farmerId: farmer.id,
        name,
        email: loginEmail,
        role: ROLES.FARMER,
        passwordHash: await bcrypt.hash(loginPassword, 10),
      },
    });
  }

  redirect(`/farmers/${farmer.id}`);
}

export async function addFarmerContactAction(formData: FormData) {
  const session = await requireSession();
  if (session.role === ROLES.FARMER) return { error: "Ask the service company to update farm contacts." };

  const farmerId = formString(formData, "farmerId");
  const name = formString(formData, "contactName");
  const email = formString(formData, "contactEmail").toLowerCase();
  const phone = formString(formData, "contactPhone");
  if (!name) return { error: "Contact name is required." };

  const farmer = await prisma.farmer.findFirst({
    where: { id: farmerId, organizationId: session.organizationId },
  });
  if (!farmer) return { error: "Farm not found." };

  await prisma.farmerContact.create({
    data: {
      farmerId,
      name,
      email: email || null,
      phone: phone || null,
    },
  });
  redirect(`/farmers/${farmerId}`);
}

export async function updateFarmerAction(formData: FormData) {
  const session = await requireSession();
  if (session.role === ROLES.FARMER) return { error: "Ask the service company to update the farm." };

  const farmerId = formString(formData, "farmerId");
  const name = formString(formData, "name");
  const address = formString(formData, "address");
  if (!name) return { error: "Farm name is required." };

  const farmer = await prisma.farmer.findFirst({
    where: { id: farmerId, organizationId: session.organizationId },
  });
  if (!farmer) return { error: "Farm not found." };

  await prisma.farmer.update({
    where: { id: farmerId },
    data: {
      name,
      address: address || null,
      storeId: await resolveStoreId(session.organizationId, formString(formData, "storeId")),
    },
  });
  redirect(`/farmers/${farmerId}`);
}

export async function updateFarmerStoreAction(formData: FormData) {
  const session = await requireSession();
  const farmerId = formString(formData, "farmerId");
  if (session.role === ROLES.FARMER && session.farmerId !== farmerId) {
    return { error: "You can only set the store for your farm." };
  }
  if (session.role !== ROLES.FARMER && !isShopStaff(session.role)) {
    return { error: "You cannot set a farm store." };
  }

  const farmer = await prisma.farmer.findFirst({
    where: { id: farmerId, organizationId: session.organizationId },
  });
  if (!farmer) return { error: "Farm not found." };

  await prisma.farmer.update({
    where: { id: farmerId },
    data: { storeId: await resolveStoreId(session.organizationId, formString(formData, "storeId")) },
  });
  redirect(session.role === ROLES.FARMER ? "/dashboard" : `/farmers/${farmerId}`);
}

export async function updateFarmerContactAction(formData: FormData) {
  const session = await requireSession();
  if (session.role === ROLES.FARMER) return { error: "Ask the service company to update farm contacts." };

  const contactId = formString(formData, "contactId");
  const name = formString(formData, "contactName");
  const email = formString(formData, "contactEmail").toLowerCase();
  const phone = formString(formData, "contactPhone");
  if (!name) return { error: "Contact name is required." };

  const contact = await prisma.farmerContact.findFirst({
    where: { id: contactId, farmer: { organizationId: session.organizationId } },
  });
  if (!contact) return { error: "Contact not found." };

  await prisma.farmerContact.update({
    where: { id: contactId },
    data: { name, email: email || null, phone: phone || null },
  });
  redirect(`/farmers/${contact.farmerId}`);
}

export async function createTechnicianAction(formData: FormData) {
  const session = await requireSession();
  if (!canAddTechnicians(session.role)) return { error: "Only managers and admins can add technicians." };

  const name = formString(formData, "name");
  const email = formString(formData, "email").toLowerCase();
  const password = formString(formData, "password");
  const phone = formString(formData, "phone");
  const revealVehicleNumber = formString(formData, "revealVehicleNumber");
  if (!name || !email || password.length < 8) {
    return { error: "Name, email, and an 8+ character password are required." };
  }

  await prisma.user.create({
    data: {
      organizationId: session.organizationId,
      name,
      email,
      role: ROLES.TECHNICIAN,
      passwordHash: await bcrypt.hash(password, 10),
      phone: phone || null,
      revealVehicleNumber: revealVehicleNumber || null,
    },
  });
  redirect("/technicians");
}

export async function createStaffAction(formData: FormData) {
  const session = await requireSession();
  if (!isAdmin(session.role)) return { error: "Only company admins can add staff." };

  const name = formString(formData, "name");
  const email = formString(formData, "email").toLowerCase();
  const password = formString(formData, "password");
  const phone = formString(formData, "phone");
  const revealVehicleNumber = formString(formData, "revealVehicleNumber");
  const role = formString(formData, "role");
  if (!name || !email || password.length < 8) {
    return { error: "Name, email, and an 8+ character password are required." };
  }
  if (!isShopStaffRole(role)) return { error: "Role must be admin, manager, or technician." };

  await prisma.user.create({
    data: {
      organizationId: session.organizationId,
      name,
      email,
      role,
      passwordHash: await bcrypt.hash(password, 10),
      phone: phone || null,
      revealVehicleNumber: role === ROLES.TECHNICIAN ? revealVehicleNumber || null : null,
    },
  });
  redirect("/staff");
}

export async function importStaffAction(formData: FormData) {
  const session = await requireSession();
  if (!canImportStaff(session.role)) return { error: "Only company admins can import staff." };

  const file = formData.get("file");
  const defaultPassword = formString(formData, "defaultPassword");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a CSV of staff to import." };
  }
  if (file.size > 1_000_000) return { error: "File is too large. Keep it under 1 MB." };

  const rows = parseStaffImport(await file.text());
  if (rows.length === 0) {
    return { error: "No staff found. Use columns Name, Email, Role (Admin, Manager, or Technician)." };
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const adminCount = await prisma.user.count({
    where: { organizationId: session.organizationId, role: ROLES.ADMIN },
  });
  let remainingAdmins = adminCount;

  for (const row of rows.slice(0, 500)) {
    const existing = await prisma.user.findFirst({
      where: { organizationId: session.organizationId, email: row.email },
    });
    if (existing && !isShopStaffRole(existing.role)) {
      skipped += 1;
      continue;
    }
    if (existing) {
      if (existing.id === session.userId && row.role !== existing.role) {
        skipped += 1;
        continue;
      }
      if (existing.role === ROLES.ADMIN && row.role !== ROLES.ADMIN && remainingAdmins <= 1) {
        skipped += 1;
        continue;
      }
      if (existing.role === ROLES.ADMIN && row.role !== ROLES.ADMIN) remainingAdmins -= 1;
      if (existing.role !== ROLES.ADMIN && row.role === ROLES.ADMIN) remainingAdmins += 1;
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: row.name,
          role: row.role,
          phone: row.phone || existing.phone,
          revealVehicleNumber:
            row.role === ROLES.TECHNICIAN
              ? row.revealVehicleNumber || existing.revealVehicleNumber
              : null,
          ...(row.password && row.password.length >= 8
            ? { passwordHash: await bcrypt.hash(row.password, 10) }
            : {}),
        },
      });
      updated += 1;
      continue;
    }
    const password = row.password && row.password.length >= 8 ? row.password : defaultPassword;
    if (!password || password.length < 8) {
      skipped += 1;
      continue;
    }
    await prisma.user.create({
      data: {
        organizationId: session.organizationId,
        name: row.name,
        email: row.email,
        role: row.role,
        passwordHash: await bcrypt.hash(password, 10),
        phone: row.phone,
        revealVehicleNumber: row.role === ROLES.TECHNICIAN ? row.revealVehicleNumber : null,
      },
    });
    if (row.role === ROLES.ADMIN) remainingAdmins += 1;
    created += 1;
  }

  redirect(`/staff?imported=${created}&updated=${updated}&skipped=${skipped}`);
}

export async function createManagerAction(formData: FormData) {
  const session = await requireSession();
  if (!isAdmin(session.role)) return { error: "Only company admins can add managers." };

  const name = formString(formData, "name");
  const email = formString(formData, "email").toLowerCase();
  const password = formString(formData, "password");
  const phone = formString(formData, "phone");
  if (!name || !email || password.length < 8) {
    return { error: "Name, email, and an 8+ character password are required." };
  }

  await prisma.user.create({
    data: {
      organizationId: session.organizationId,
      name,
      email,
      role: ROLES.MANAGER,
      passwordHash: await bcrypt.hash(password, 10),
      phone: phone || null,
    },
  });
  redirect("/managers");
}

export async function deleteFarmerAction(formData: FormData) {
  const session = await requireSession();
  if (!canDeleteRecords(session.role)) return { error: "Only company admins can delete." };
  const farmerId = formString(formData, "farmerId");
  const farmer = await prisma.farmer.findFirst({
    where: { id: farmerId, organizationId: session.organizationId },
  });
  if (!farmer) return { error: "Farm not found." };
  await prisma.farmer.delete({ where: { id: farmerId } });
  redirect("/farmers");
}

export async function deleteFarmerContactAction(formData: FormData) {
  const session = await requireSession();
  if (!canDeleteRecords(session.role)) return { error: "Only company admins can delete." };
  const contactId = formString(formData, "contactId");
  const contact = await prisma.farmerContact.findFirst({
    where: { id: contactId, farmer: { organizationId: session.organizationId } },
  });
  if (!contact) return { error: "Contact not found." };
  const farmerId = contact.farmerId;
  await prisma.farmerContact.delete({ where: { id: contactId } });
  redirect(`/farmers/${farmerId}`);
}

export async function deletePivotAction(formData: FormData) {
  const session = await requireSession();
  if (!canDeleteRecords(session.role)) return { error: "Only company admins can delete." };
  const pivotId = formString(formData, "pivotId");
  const pivot = await prisma.pivot.findFirst({
    where: { id: pivotId, organizationId: session.organizationId },
  });
  if (!pivot) return { error: "Pivot not found." };
  await prisma.pivot.delete({ where: { id: pivotId } });
  redirect("/pivots");
}

export async function deleteTicketAction(formData: FormData) {
  const session = await requireSession();
  if (!canDeleteRecords(session.role)) return { error: "Only company admins can delete." };
  const ticketId = formString(formData, "ticketId");
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, organizationId: session.organizationId },
  });
  if (!ticket) return { error: "Ticket not found." };
  await prisma.ticket.delete({ where: { id: ticketId } });
  redirect("/tickets");
}

export async function deleteStaffAction(formData: FormData) {
  const session = await requireSession();
  if (!canDeleteRecords(session.role)) return { error: "Only company admins can delete." };
  const userId = formString(formData, "userId");
  if (userId === session.userId) return { error: "You cannot delete your own login." };
  const user = await prisma.user.findFirst({
    where: { id: userId, organizationId: session.organizationId },
  });
  if (!user || !isShopStaffRole(user.role)) {
    return { error: "Staff member not found." };
  }
  if (user.role === ROLES.ADMIN) {
    const admins = await prisma.user.count({
      where: { organizationId: session.organizationId, role: ROLES.ADMIN },
    });
    if (admins <= 1) return { error: "Keep at least one company admin." };
  }
  await prisma.user.delete({ where: { id: userId } });
  redirect("/staff");
}

export async function createStoreAction(formData: FormData) {
  const session = await requireSession();
  if (!isAdmin(session.role)) return { error: "Only company admins can add stores." };

  const name = formString(formData, "name");
  const address = formString(formData, "address");
  const phone = formString(formData, "phone");
  if (!name) return { error: "Store name is required." };

  const existing = await prisma.store.findFirst({
    where: { organizationId: session.organizationId, name },
  });
  if (existing) return { error: "A store with that name already exists." };

  await prisma.store.create({
    data: {
      organizationId: session.organizationId,
      name,
      address: address || null,
      phone: phone || null,
    },
  });
  redirect("/stores");
}

export async function updateStoreAction(formData: FormData) {
  const session = await requireSession();
  if (!isAdmin(session.role)) return { error: "Only company admins can edit stores." };

  const storeId = formString(formData, "storeId");
  const name = formString(formData, "name");
  const address = formString(formData, "address");
  const phone = formString(formData, "phone");
  if (!name) return { error: "Store name is required." };

  const store = await prisma.store.findFirst({
    where: { id: storeId, organizationId: session.organizationId },
  });
  if (!store) return { error: "Store not found." };

  const clash = await prisma.store.findFirst({
    where: { organizationId: session.organizationId, name, NOT: { id: storeId } },
  });
  if (clash) return { error: "A store with that name already exists." };

  await prisma.store.update({
    where: { id: storeId },
    data: { name, address: address || null, phone: phone || null },
  });
  redirect("/stores");
}

export async function deleteStoreAction(formData: FormData) {
  const session = await requireSession();
  if (!canDeleteRecords(session.role)) return { error: "Only company admins can delete stores." };

  const storeId = formString(formData, "storeId");
  const store = await prisma.store.findFirst({
    where: { id: storeId, organizationId: session.organizationId },
  });
  if (!store) return { error: "Store not found." };

  await prisma.store.delete({ where: { id: storeId } });
  redirect("/stores");
}

export async function createPivotAction(formData: FormData) {
  const session = await requireSession();
  if (session.role === ROLES.FARMER) return { error: "Farmers cannot add pivots." };

  const name = formString(formData, "name");
  const serialNumber = formString(formData, "serialNumber");
  const locationNote = formString(formData, "locationNote");
  const mapsInput = formString(formData, "mapsInput");
  const latitude = Number(formString(formData, "latitude"));
  const longitude = Number(formString(formData, "longitude"));

  const parsed = mapsInput ? parseMapsLocation(mapsInput) : null;
  const lat = parsed?.latitude ?? latitude;
  const lng = parsed?.longitude ?? longitude;

  if (!name || Number.isNaN(lat) || Number.isNaN(lng)) {
    return { error: "Name and a map location are required." };
  }

  let farmerId = formString(formData, "farmerId");
  if (formString(formData, "farmerMode") === "new") {
    const farmerName = formString(formData, "farmerName");
    if (!farmerName) return { error: "Farm name is required." };
    const created = await createFarmWithContact(session.organizationId, {
      name: farmerName,
      address: formString(formData, "farmerAddress"),
      contactName: formString(formData, "farmerContactName"),
      phone: formString(formData, "farmerPhone"),
      email: formString(formData, "farmerEmail").toLowerCase(),
    });
    farmerId = created.id;
  }

  if (!farmerId) return { error: "Select a farm or add a new one." };

  const farmer = await prisma.farmer.findFirst({
    where: { id: farmerId, organizationId: session.organizationId },
  });
  if (!farmer) return { error: "Farm not found." };

  const pivot = await prisma.pivot.create({
    data: {
      organizationId: session.organizationId,
      farmerId,
      name,
      latitude: lat,
      longitude: lng,
      serialNumber: serialNumber || null,
      locationNote: locationNote || null,
    },
  });
  redirect(`/pivots/${pivot.id}`);
}

export async function updatePivotAction(formData: FormData) {
  const session = await requireSession();
  if (session.role === ROLES.FARMER) return { error: "Farmers cannot edit pivots." };

  const pivotId = formString(formData, "pivotId");
  const name = formString(formData, "name");
  const serialNumber = formString(formData, "serialNumber");
  const locationNote = formString(formData, "locationNote");
  const farmerId = formString(formData, "farmerId");
  const mapsInput = formString(formData, "mapsInput");
  const latitude = Number(formString(formData, "latitude"));
  const longitude = Number(formString(formData, "longitude"));
  const parsed = mapsInput ? parseMapsLocation(mapsInput) : null;
  const lat = parsed?.latitude ?? latitude;
  const lng = parsed?.longitude ?? longitude;

  if (!name || Number.isNaN(lat) || Number.isNaN(lng)) {
    return { error: "Name and a map location are required." };
  }

  const pivot = await prisma.pivot.findFirst({
    where: { id: pivotId, organizationId: session.organizationId },
  });
  if (!pivot) return { error: "Pivot not found." };

  const farmer = await prisma.farmer.findFirst({
    where: { id: farmerId, organizationId: session.organizationId },
  });
  if (!farmer) return { error: "Farm not found." };

  await prisma.pivot.update({
    where: { id: pivotId },
    data: {
      farmerId,
      name,
      latitude: lat,
      longitude: lng,
      serialNumber: serialNumber || null,
      locationNote: locationNote || null,
    },
  });
  if (farmerId !== pivot.farmerId) {
    await prisma.ticket.updateMany({
      where: { pivotId, organizationId: session.organizationId },
      data: { farmerId },
    });
  }
  redirect(`/pivots/${pivotId}`);
}

export async function addPivotNoteAction(formData: FormData) {
  const session = await requireSession();
  const pivotId = formString(formData, "pivotId");
  const message = formString(formData, "message");
  if (!message) return { error: "Write a note before saving." };

  const pivot = await prisma.pivot.findFirst({
    where: { id: pivotId, organizationId: session.organizationId },
  });
  if (!pivot) return { error: "Pivot not found." };
  if (session.role === ROLES.FARMER && session.farmerId !== pivot.farmerId) {
    return { error: "You can only add notes on your own pivots." };
  }

  await prisma.pivotNote.create({
    data: { pivotId, userId: session.userId, message },
  });
  redirect(`/pivots/${pivotId}`);
}

export async function createTicketAction(formData: FormData) {
  const session = await requireSession();
  const title = formString(formData, "title");
  const description = formString(formData, "description");
  const priority = formString(formData, "priority") || "NORMAL";
  const technicianId = formString(formData, "technicianId") || null;
  const siteMode = formString(formData, "siteMode") || "existing";

  if (!title || !description) {
    return { error: "Title and description are required." };
  }
  if (!PRIORITIES.includes(priority as (typeof PRIORITIES)[number])) {
    return { error: "Invalid priority." };
  }

  let pivot = null as Awaited<ReturnType<typeof prisma.pivot.findFirst>>;

  if (siteMode === "new") {
    if (session.role === ROLES.FARMER && !session.farmerId) {
      return { error: "Your farmer account is not linked." };
    }

    const pivotName = formString(formData, "pivotName");
    const serialNumber = formString(formData, "serialNumber");
    const mapsInput = formString(formData, "mapsInput");
    const latitude = Number(formString(formData, "latitude"));
    const longitude = Number(formString(formData, "longitude"));
    const parsed = mapsInput ? parseMapsLocation(mapsInput) : null;
    const lat = parsed?.latitude ?? latitude;
    const lng = parsed?.longitude ?? longitude;
    if (!pivotName || Number.isNaN(lat) || Number.isNaN(lng)) {
      return { error: "Pivot name and a map location are required." };
    }

    let farmerId = formString(formData, "farmerId");
    if (session.role === ROLES.FARMER) {
      farmerId = session.farmerId ?? "";
    } else if (formString(formData, "farmerMode") === "new") {
      const farmerName = formString(formData, "farmerName");
      if (!farmerName) return { error: "Farm name is required." };
      const farmer = await createFarmWithContact(session.organizationId, {
        name: farmerName,
        address: formString(formData, "farmerAddress"),
        contactName: formString(formData, "farmerContactName"),
        phone: formString(formData, "farmerPhone"),
        email: formString(formData, "farmerEmail").toLowerCase(),
      });
      farmerId = farmer.id;
    }

    if (!farmerId) return { error: "Select a farm or add a new one." };
    const farmer = await prisma.farmer.findFirst({
      where: { id: farmerId, organizationId: session.organizationId },
    });
    if (!farmer) return { error: "Farm not found." };

    pivot = await prisma.pivot.create({
      data: {
        organizationId: session.organizationId,
        farmerId,
        name: pivotName,
        latitude: lat,
        longitude: lng,
        serialNumber: serialNumber || null,
        locationNote: mapsInput || null,
      },
    });
  } else {
    const pivotId = formString(formData, "pivotId");
    if (!pivotId) return { error: "Select a pivot or add a new location." };
    pivot = await prisma.pivot.findFirst({
      where: { id: pivotId, organizationId: session.organizationId },
    });
    if (!pivot) return { error: "Pivot not found." };
    if (session.role === ROLES.FARMER && session.farmerId !== pivot.farmerId) {
      return { error: "You can only open tickets on your own pivots." };
    }
  }

  if (!pivot) return { error: "Pivot not found." };

  const photos = photoFilesFromForm(formData);
  const photoCheck = validatePhotoFiles(photos);
  if (photoCheck.error) return photoCheck;

  let assigned: string | null = technicianId;
  if (session.role === ROLES.FARMER) assigned = null;
  else if (session.role === ROLES.TECHNICIAN) assigned = session.userId;
  else if (!canAssignTickets(session.role)) assigned = null;

  const ticket = await openServiceTicket({
    organizationId: session.organizationId,
    farmerId: pivot.farmerId,
    pivotId: pivot.id,
    technicianId: assigned,
    userId: session.userId,
    title,
    description,
    priority,
    scheduledAt: parseDateTimeLocal(formString(formData, "scheduledAt")),
  });
  if (assigned) {
    await notifyTicketSms({
      organizationId: session.organizationId,
      ticketId: ticket.id,
      kind: "assigned",
      actorUserId: session.userId,
    });
  } else if (session.role === ROLES.FARMER) {
    await notifyTicketSms({
      organizationId: session.organizationId,
      ticketId: ticket.id,
      kind: "opened",
      actorUserId: session.userId,
      note: description,
    });
  }

  const opened = await prisma.ticketUpdate.findFirst({
    where: { ticketId: ticket.id },
    orderBy: { createdAt: "asc" },
  });
  const saved = await saveTicketPhotos({
    files: photos,
    ticketId: ticket.id,
    updateId: opened?.id,
    userId: session.userId,
  });
  if (saved.error) return saved;

  redirect(`/tickets/${ticket.id}`);
}

export async function updateTicketAction(formData: FormData) {
  const session = await requireSession();
  const ticketId = formString(formData, "ticketId");
  const message = formString(formData, "message");
  const status = formString(formData, "status") as TicketStatus;
  const technicianId = formString(formData, "technicianId");

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, organizationId: session.organizationId },
  });
  if (!ticket) return { error: "Ticket not found." };

  const photos = photoFilesFromForm(formData);
  const photoCheck = validatePhotoFiles(photos);
  if (photoCheck.error) return photoCheck;

  if (session.role === ROLES.FARMER) {
    if (session.farmerId !== ticket.farmerId) return { error: "Not allowed." };
    if (!message && photos.length === 0) return { error: "Add a note or a photo for the service team." };
    const note = message || `Added ${photos.length} photo${photos.length === 1 ? "" : "s"}.`;
    const stamp = new Date().toLocaleString();
    const update = await prisma.ticketUpdate.create({
      data: { ticketId, userId: session.userId, message: note },
    });
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        description: `${ticket.description}\n\n[Farm update ${stamp}]\n${note}`,
      },
    });
    const saved = await saveTicketPhotos({
      files: photos,
      ticketId,
      updateId: update.id,
      userId: session.userId,
    });
    if (saved.error) return saved;
    await notifyTicketSms({
      organizationId: session.organizationId,
      ticketId,
      kind: "updated",
      actorUserId: session.userId,
      note,
    });
    redirect(`/tickets/${ticketId}`);
  }

  if (session.role === ROLES.TECHNICIAN && ticket.technicianId !== session.userId) {
    return { error: "This ticket is not assigned to you." };
  }

  if (!TICKET_STATUSES.includes(status)) return { error: "Invalid status." };

  const invoiceNumber = formString(formData, "invoiceNumber");
  const invoiceAmount = parseMoneyInput(formString(formData, "invoiceAmount"));
  if (requiresInvoice(status)) {
    if (!invoiceNumber) {
      return { error: "An invoice number is required before a ticket can be closed." };
    }
    if (invoiceAmount == null) {
      return { error: "An invoice amount is required before a ticket can be closed." };
    }
    const clash = await prisma.ticket.findFirst({
      where: {
        organizationId: session.organizationId,
        invoiceNumber,
        NOT: { id: ticketId },
      },
    });
    if (clash) {
      return { error: `Invoice ${invoiceNumber} is already on ticket #${clash.number}.` };
    }
  }

  const nextTech =
    canAssignTickets(session.role)
      ? technicianId || null
      : ticket.technicianId;

  const previousTech = ticket.technicianId;
  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status,
      technicianId: nextTech,
      invoiceNumber: invoiceNumber || ticket.invoiceNumber,
      invoiceAmount: requiresInvoice(status) ? invoiceAmount : ticket.invoiceAmount,
      scheduledAt: parseDateTimeLocal(formString(formData, "scheduledAt")),
      closedAt: requiresInvoice(status) ? (ticket.closedAt ?? new Date()) : ticket.closedAt,
    },
  });
  if (isFinishedStatus(status) || status === "REPAIR_DONE") {
    await closeOpenSiteVisits(ticketId);
  }

  const note = message || `Status set to ${status.replaceAll("_", " ").toLowerCase()}.`;
  const update = await prisma.ticketUpdate.create({
    data: {
      ticketId,
      userId: session.userId,
      message: note,
      status,
    },
  });
  const saved = await saveTicketPhotos({
    files: photos,
    ticketId,
    updateId: update.id,
    userId: session.userId,
  });
  if (saved.error) return saved;
  await notifyTicketSms({
    organizationId: session.organizationId,
    ticketId,
    kind: nextTech && nextTech !== previousTech ? "assigned" : "updated",
    actorUserId: session.userId,
    note,
  });
  redirect(`/tickets/${ticketId}`);
}

export async function assignTicketAction(formData: FormData) {
  const session = await requireSession();
  if (session.role === ROLES.FARMER) return { error: "Farmers cannot dispatch tickets." };

  const ticketId = formString(formData, "ticketId");
  const technicianId = formString(formData, "technicianId");
  const status = formString(formData, "status");

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, organizationId: session.organizationId },
  });
  if (!ticket) return { error: "Ticket not found." };

  if (session.role === ROLES.TECHNICIAN && ticket.technicianId !== session.userId) {
    return { error: "This ticket is not assigned to you." };
  }

  const nextTech =
    canAssignTickets(session.role) ? technicianId || null : ticket.technicianId;
  let nextStatus: string = TICKET_STATUSES.includes(status as TicketStatus) ? status : ticket.status;
  if (nextTech && nextStatus === "OPEN") nextStatus = "ASSIGNED";
  if (!nextTech && nextStatus === "ASSIGNED") nextStatus = "OPEN";
  if (requiresInvoice(nextStatus) && (!ticket.invoiceNumber || ticket.invoiceAmount == null)) {
    return { error: "Close this ticket from the ticket page and enter an invoice number and amount." };
  }

  const previousTech = ticket.technicianId;
  await prisma.ticket.update({
    where: { id: ticketId },
    data: { technicianId: nextTech, status: nextStatus },
  });
  await prisma.ticketUpdate.create({
    data: {
      ticketId,
      userId: session.userId,
      message: "Updated from the dispatch board.",
      status: nextStatus,
    },
  });
  await notifyTicketSms({
    organizationId: session.organizationId,
    ticketId,
    kind: nextTech && nextTech !== previousTech ? "assigned" : "updated",
    actorUserId: session.userId,
    note: "Updated from the dispatch board.",
  });
  redirect("/dispatch");
}

export async function addTicketPartAction(formData: FormData) {
  const session = await requireSession();
  if (session.role === ROLES.FARMER) return { error: "Farmers can view parts but not log them." };

  const ticketId = formString(formData, "ticketId");
  const catalogPartId = formString(formData, "catalogPartId");
  const customName = formString(formData, "name");
  const quantity = Number(formString(formData, "quantity") || "1");
  const skuInput = formString(formData, "sku");

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, organizationId: session.organizationId },
  });
  if (!ticket) return { error: "Ticket not found." };
  if (session.role === ROLES.TECHNICIAN && ticket.technicianId !== session.userId) {
    return { error: "This ticket is not assigned to you." };
  }
  if (Number.isNaN(quantity) || quantity <= 0) {
    return { error: "Quantity must be greater than 0." };
  }

  let name = customName;
  let sku: string | null = skuInput || null;
  let unitPrice: number | null = null;
  let catalogId: string | null = null;

  if (catalogPartId) {
    const catalog = await prisma.catalogPart.findFirst({
      where: { id: catalogPartId, organizationId: session.organizationId, active: true },
    });
    if (!catalog) return { error: "That catalog part was not found." };
    name = catalog.name;
    sku = catalog.sku;
    unitPrice = catalog.price;
    catalogId = catalog.id;
  }

  if (!name) return { error: "Pick a catalog part or type a custom name." };

  await prisma.ticketPart.create({
    data: {
      ticketId,
      userId: session.userId,
      catalogPartId: catalogId,
      name,
      quantity,
      sku,
      unitPrice,
    },
  });
  await prisma.ticketUpdate.create({
    data: {
      ticketId,
      userId: session.userId,
      message: `Parts logged: ${quantity} × ${name}${sku ? ` (${sku})` : ""}.`,
    },
  });
  await notifyTicketSms({
    organizationId: session.organizationId,
    ticketId,
    kind: "updated",
    actorUserId: session.userId,
    note: `Parts logged: ${quantity} × ${name}.`,
  });
  redirect(`/tickets/${ticketId}`);
}

export async function createCatalogPartAction(formData: FormData) {
  const session = await requireSession();
  if (session.role !== ROLES.ADMIN) return { error: "Only company admins can add catalog parts." };

  const name = formString(formData, "name");
  const sku = formString(formData, "sku");
  const description = formString(formData, "description");
  const itemType = formString(formData, "itemType");
  const price = formString(formData, "price");
  const cost = formString(formData, "cost");
  if (!name) return { error: "Part name is required." };

  await prisma.catalogPart.upsert({
    where: { organizationId_name: { organizationId: session.organizationId, name } },
    create: {
      organizationId: session.organizationId,
      name,
      sku: sku || null,
      description: description || null,
      itemType: itemType || null,
      price: price ? Number(price) : null,
      cost: cost ? Number(cost) : null,
      source: "MANUAL",
    },
    update: {
      sku: sku || null,
      description: description || null,
      itemType: itemType || null,
      price: price ? Number(price) : null,
      cost: cost ? Number(cost) : null,
      active: true,
    },
  });
  redirect("/parts");
}

export async function importCatalogPartsBatchAction(
  parts: unknown,
): Promise<{ created: number; updated: number } | { error: string }> {
  const session = await requireSession();
  if (session.role !== ROLES.ADMIN) return { error: "Only company admins can import parts." };
  if (!Array.isArray(parts) || parts.length === 0) {
    return { error: "No parts in this batch." };
  }
  if (parts.length > 400) return { error: "Each import batch must be 400 parts or fewer." };

  try {
    return await importCatalogPartBatch(session.organizationId, parts);
  } catch (error) {
    console.error("Parts import batch failed", error);
    return { error: "This batch failed to save. Try the import again; already-imported names will update." };
  }
}

export async function importAgSensePivotsAction(formData: FormData) {
  const session = await requireSession();
  if (!canImportPivots(session.role)) return { error: "Only company admins can import pivots." };

  const file = formData.get("file");
  const defaultFarmerId = formString(formData, "defaultFarmerId");
  const createFarmers = formString(formData, "createFarmers") === "on";

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an AgSense CSV export to import." };
  }
  if (file.size > 2_000_000) return { error: "File is too large. Keep the export under 2 MB." };

  const rows = parseAgSenseExport(await file.text());
  if (rows.length === 0) {
    return {
      error:
        "No pivots found. Export the AgSense device list as CSV with Device Name and Latitude/Longitude columns.",
    };
  }

  const farmers = await prisma.farmer.findMany({
    where: { organizationId: session.organizationId },
  });
  const farmerByName = new Map(farmers.map((farmer) => [farmer.name.trim().toLowerCase(), farmer]));

  const defaultFarmer = defaultFarmerId
    ? farmers.find((farmer) => farmer.id === defaultFarmerId)
    : null;

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let farmersCreated = 0;

  for (const row of rows.slice(0, 2000)) {
    let farmer = row.grower ? farmerByName.get(row.grower.toLowerCase()) : undefined;
    if (!farmer && row.grower && createFarmers) {
      farmer = await prisma.farmer.create({
        data: {
          organizationId: session.organizationId,
          name: row.grower,
          contacts: { create: { name: row.grower } },
        },
      });
      farmerByName.set(row.grower.toLowerCase(), farmer);
      farmersCreated += 1;
    }
    farmer = farmer ?? defaultFarmer ?? undefined;
    if (!farmer) {
      skipped += 1;
      continue;
    }

    const existing = row.serialNumber
      ? await prisma.pivot.findFirst({
          where: { organizationId: session.organizationId, serialNumber: row.serialNumber },
        })
      : await prisma.pivot.findFirst({
          where: { organizationId: session.organizationId, farmerId: farmer.id, name: row.name },
        });

    const data = {
      farmerId: farmer.id,
      name: row.name,
      latitude: row.latitude,
      longitude: row.longitude,
      serialNumber: row.serialNumber,
      locationNote: row.locationNote,
    };

    if (existing) {
      await prisma.pivot.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.pivot.create({
        data: {
          organizationId: session.organizationId,
          ...data,
        },
      });
      created += 1;
    }
  }

  redirect(
    `/pivots?imported=${created}&updated=${updated}&skipped=${skipped}&farmers=${farmersCreated}`,
  );
}

export async function startStartupInspectionAction(formData: FormData) {
  const session = await requireSession();
  if (session.role === ROLES.FARMER) return { error: "Farmers cannot run startup inspections." };

  const pivotId = formString(formData, "pivotId");
  const pivot = await prisma.pivot.findFirst({
    where: { id: pivotId, organizationId: session.organizationId },
  });
  if (!pivot) return { error: "Pivot not found." };

  const existing = await prisma.startupInspection.findUnique({
    where: { pivotId_seasonYear: { pivotId, seasonYear: STARTUP_SEASON_YEAR } },
  });
  if (existing) redirect(`/startup/${existing.id}`);

  const templates = await ensureStartupTemplates(session.organizationId);
  if (templates.length === 0) return { error: "Add at least one checklist item before starting an inspection." };

  const inspection = await prisma.startupInspection.create({
    data: {
      organizationId: session.organizationId,
      pivotId,
      seasonYear: STARTUP_SEASON_YEAR,
      status: INSPECTION_STATUS.IN_PROGRESS,
      inspectorId: session.userId,
      checks: {
        create: templates.map((check) => ({
          checkKey: check.checkKey,
          label: check.label,
          detail: check.detail,
          sortOrder: check.sortOrder,
          result: "PENDING",
        })),
      },
    },
  });
  redirect(`/startup/${inspection.id}`);
}

export async function saveStartupChecksAction(formData: FormData) {
  const session = await requireSession();
  if (session.role === ROLES.FARMER) return { error: "Farmers cannot update inspections." };

  const inspectionId = formString(formData, "inspectionId");
  const inspection = await prisma.startupInspection.findFirst({
    where: { id: inspectionId, organizationId: session.organizationId },
    include: { pivot: true, checks: true },
  });
  if (!inspection) return { error: "Inspection not found." };

  const results = inspection.checks.map((check) => ({
    key: check.checkKey,
    label: checkLabel(check),
    result: formString(formData, `result_${check.checkKey}`) || "PENDING",
    notes: formString(formData, `notes_${check.checkKey}`),
  }));

  await prisma.$transaction(
    results.map((item) =>
      prisma.startupCheck.update({
        where: {
          inspectionId_checkKey: { inspectionId, checkKey: item.key },
        },
        data: { result: item.result, notes: item.notes || null },
      }),
    ),
  );

  const failed = results.filter((item) => item.result === "FAIL");
  const pending = results.filter((item) => item.result === "PENDING");
  let status: string = INSPECTION_STATUS.IN_PROGRESS;
  if (failed.length > 0) status = INSPECTION_STATUS.FAILED;
  else if (pending.length === 0) status = INSPECTION_STATUS.PASSED;

  let ticketId = inspection.ticketId;
  if (failed.length > 0 && !ticketId) {
    const failLabels = failed.map((item) => item.label).join(", ");
    const ticket = await openServiceTicket({
      organizationId: session.organizationId,
      farmerId: inspection.pivot.farmerId,
      pivotId: inspection.pivotId,
      technicianId: session.role === ROLES.TECHNICIAN ? session.userId : inspection.inspectorId,
      userId: session.userId,
      title: `${STARTUP_SEASON_YEAR} startup fail: ${inspection.pivot.name}`,
      description: `Pre-season startup failed on: ${failLabels}.`,
      priority: "HIGH",
    });
    ticketId = ticket.id;
    await notifyTicketSms({
      organizationId: session.organizationId,
      ticketId: ticket.id,
      kind: "assigned",
      actorUserId: session.userId,
      note: ticket.description,
    });
  }

  await prisma.startupInspection.update({
    where: { id: inspectionId },
    data: {
      status,
      inspectorId: session.userId,
      ticketId,
    },
  });

  redirect(`/startup/${inspectionId}`);
}

export async function addStartupCheckTemplateAction(formData: FormData) {
  const session = await requireSession();
  if (!canEditStartupChecklist(session.role)) {
    return { error: "Only managers and admins can edit the startup checklist." };
  }
  const label = formString(formData, "label");
  const detail = formString(formData, "detail");
  if (!label) return { error: "Item name is required." };
  const templates = await ensureStartupTemplates(session.organizationId);
  const used = new Set(templates.map((item) => item.checkKey));
  const maxOrder = templates.reduce((max, item) => Math.max(max, item.sortOrder), -1);
  await prisma.startupCheckTemplate.create({
    data: {
      organizationId: session.organizationId,
      checkKey: uniqueCheckKey(label, used),
      label,
      detail,
      sortOrder: maxOrder + 1,
    },
  });
  redirect("/startup/checklist");
}

export async function updateStartupCheckTemplateAction(formData: FormData) {
  const session = await requireSession();
  if (!canEditStartupChecklist(session.role)) {
    return { error: "Only managers and admins can edit the startup checklist." };
  }
  const id = formString(formData, "id");
  const label = formString(formData, "label");
  const detail = formString(formData, "detail");
  if (!label) return { error: "Item name is required." };
  const item = await prisma.startupCheckTemplate.findFirst({
    where: { id, organizationId: session.organizationId },
  });
  if (!item) return { error: "Checklist item not found." };
  await prisma.startupCheckTemplate.update({
    where: { id },
    data: { label, detail },
  });
  redirect("/startup/checklist");
}

export async function deleteStartupCheckTemplateAction(formData: FormData) {
  const session = await requireSession();
  if (!canEditStartupChecklist(session.role)) {
    return { error: "Only managers and admins can edit the startup checklist." };
  }
  const id = formString(formData, "id");
  const count = await prisma.startupCheckTemplate.count({
    where: { organizationId: session.organizationId },
  });
  if (count <= 1) return { error: "Keep at least one checklist item." };
  const item = await prisma.startupCheckTemplate.findFirst({
    where: { id, organizationId: session.organizationId },
  });
  if (!item) return { error: "Checklist item not found." };
  await prisma.startupCheckTemplate.delete({ where: { id } });
  redirect("/startup/checklist");
}

export async function updateTechnicianVehicleAction(formData: FormData) {
  const session = await requireSession();
  if (!canAddTechnicians(session.role)) return { error: "Only managers and admins can update technicians." };

  const technicianId = formString(formData, "technicianId");
  const revealVehicleNumber = formString(formData, "revealVehicleNumber");
  const phone = formString(formData, "phone");
  const tech = await prisma.user.findFirst({
    where: { id: technicianId, organizationId: session.organizationId, role: ROLES.TECHNICIAN },
  });
  if (!tech) return { error: "Technician not found." };

  await prisma.user.update({
    where: { id: technicianId },
    data: {
      revealVehicleNumber: revealVehicleNumber || null,
      phone: phone || null,
    },
  });
  redirect("/technicians");
}

export async function saveRevealSettingsAction(formData: FormData) {
  const session = await requireSession();
  if (session.role !== ROLES.ADMIN) return { error: "Only company admins can save Reveal settings." };

  const appId = formString(formData, "revealAppId");
  const username = formString(formData, "revealUsername");
  const password = formString(formData, "revealPassword");
  const region = formString(formData, "revealRegion") === "EU" ? REVEAL_EU : REVEAL_US;
  const meters = Number(formString(formData, "revealOnsiteMeters") || "400");
  if (!appId || !username) {
    return { error: "App ID and Reveal integration username are required." };
  }
  if (!Number.isFinite(meters) || meters < 50 || meters > 2000) {
    return { error: "On-site radius should be between 50 and 2000 meters." };
  }

  const existing = await prisma.organization.findUnique({ where: { id: session.organizationId } });
  if (!existing) return { error: "Company not found." };
  if (!password && !existing.revealPassword) {
    return { error: "Reveal integration password is required." };
  }

  await prisma.organization.update({
    where: { id: session.organizationId },
    data: {
      revealAppId: appId,
      revealUsername: username,
      revealPassword: password || existing.revealPassword,
      revealBaseUrl: region,
      revealOnsiteMeters: Math.round(meters),
    },
  });
  clearRevealTokenCache();
  redirect("/reveal");
}

export async function testRevealConnectionAction() {
  const session = await requireSession();
  if (session.role !== ROLES.ADMIN) return { error: "Only company admins can test Reveal." };
  try {
    const vehicles = await listRevealVehicles(session.organizationId);
    return { ok: `Connected. ${vehicles.length} vehicle(s) found.` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Reveal connection failed." };
  }
}

export async function currentUser() {
  return getSession();
}

export async function saveCompanyLogoAction(formData: FormData) {
  const session = await requireSession();
  if (!isAdmin(session.role)) return { error: "Only company admins can change the company logo." };
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a logo image." };
  const saved = await saveCompanyLogoFile(session.organizationId, file);
  if (saved.error || !saved.mimeType) return { error: saved.error ?? "Could not save the logo." };
  await prisma.organization.update({
    where: { id: session.organizationId },
    data: { logoMimeType: saved.mimeType, logoFileName: saved.fileName },
  });
  redirect("/company");
}

export async function removeCompanyLogoAction(_formData: FormData) {
  const session = await requireSession();
  if (!isAdmin(session.role)) return { error: "Only company admins can change the company logo." };
  await removeCompanyLogoFile(session.organizationId);
  await prisma.organization.update({
    where: { id: session.organizationId },
    data: { logoMimeType: null, logoFileName: null },
  });
  redirect("/company");
}

export async function saveBirdSettingsAction(formData: FormData) {
  const session = await requireSession();
  if (session.role !== ROLES.ADMIN) return { error: "Only company admins can save Bird SMS settings." };

  const apiKey = formString(formData, "birdApiKey");
  const from = formString(formData, "birdFrom");
  const workspaceId = formString(formData, "birdWorkspaceId");
  const channelId = formString(formData, "birdChannelId");
  const enabled = formString(formData, "birdSmsEnabled") === "on";

  const existing = await prisma.organization.findUnique({ where: { id: session.organizationId } });
  if (!existing) return { error: "Company not found." };
  const nextKey = apiKey || existing.birdApiKey;
  if (enabled && !nextKey) return { error: "Paste a Bird API key before turning SMS on." };
  if (enabled && nextKey?.startsWith("bk_") && !from) {
    return { error: "Sender ID or from-number is required for Bird SMS keys." };
  }
  if (enabled && nextKey && !nextKey.startsWith("bk_") && (!workspaceId || !channelId)) {
    return { error: "Access Key sends need a workspace ID and SMS channel ID." };
  }

  await prisma.organization.update({
    where: { id: session.organizationId },
    data: {
      birdApiKey: nextKey,
      birdFrom: from || null,
      birdWorkspaceId: workspaceId || null,
      birdChannelId: channelId || null,
      birdSmsEnabled: enabled,
    },
  });
  redirect("/sms");
}

export async function testBirdSmsAction(formData: FormData) {
  const session = await requireSession();
  if (session.role !== ROLES.ADMIN) return { error: "Only company admins can send a test SMS." };

  const to = toE164(formString(formData, "testPhone"));
  if (!to) return { error: "Enter a valid mobile number." };

  const org = await prisma.organization.findUnique({ where: { id: session.organizationId } });
  if (!org?.birdApiKey) return { error: "Save a Bird API key first." };

  try {
    await sendBirdSms(
      {
        apiKey: org.birdApiKey,
        from: org.birdFrom || org.name.slice(0, 11),
        workspaceId: org.birdWorkspaceId || "",
        channelId: org.birdChannelId || "",
      },
      to,
      `${org.name}: test SMS from AG Service Desk.`,
    );
    return { ok: `Test accepted for ${to}.` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Bird SMS failed." };
  }
}
