"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { createSession, destroySession, getSession, requireSession, verifyLogin } from "./auth";
import {
  PRIORITIES,
  ROLES,
  SHOP_STAFF_ROLES,
  TICKET_STATUSES,
  STATUS_LABELS,
  isAdmin,
  canAddTechnicians,
  canAssignTickets,
  canDeleteRecords,
  canEditStaffMember,
  canImportPivots,
  canImportStaff,
  canManageParts,
  canManageShopStaff,
  canEditDeskSettings,
  canEditStartupChecklist,
  isFinishedStatus,
  isShopStaff,
  requiresInvoice,
  slugify,
  type Role,
  type TicketStatus,
} from "./roles";
import { openServiceTicket } from "./tickets";
import { INSPECTION_STATUS, STARTUP_CHECKS, STARTUP_SEASON_YEAR, checkLabel, ensureStartupTemplates, uniqueCheckKey } from "./startup";
import { parseMapsLocation } from "./maps";
import { parseAgSenseExport } from "./agsense";
import { importCatalogPartBatch } from "./catalog-import";
import { importCatalogLaborBatch } from "./labor-import";
import { importCatalogEquipmentBatch } from "./equipment-import";
import { parseStaffImport, isShopStaffRole } from "./staff-import";
import { closeOpenSiteVisits } from "./onsite";
import { REVEAL_EU, REVEAL_US, clearRevealTokenCache, normalizeRevealAppId, syncRevealVehicles } from "./reveal";
import { notifyFarmerRepairDone, notifyTicketSms } from "./ticket-sms";
import { sendBirdSms, toE164 } from "./bird";
import { saveTicketPhotos, photoFilesFromForm, validatePhotoFiles, readTicketPhotoFile } from "./ticket-photos";
import { documentFilesFromForm, removePivotDocumentFile, safePivotReturnTo, savePivotDocuments } from "./pivot-documents";
import { saveCompanyLogoFile, removeCompanyLogoFile } from "./company-logo";
import { hashNewUserPassword, mailIsConfigured, sendPasswordResetEmail, sendWelcomeLoginEmail, userFromPasswordToken, welcomeQuery, type WelcomeMailStatus } from "./welcome-mail";
import { getPlatformSession } from "./platform";
import { parseDispatchView, saveUserDispatchView } from "./dispatch-view";
import { homePath } from "./home";
import { parseLocale, t } from "./i18n";
import { loadUserLocale, readLocaleCookie, safeNextPath, saveUserLocale, writeLocaleCookie, getRequestLocale } from "./user-locale";
import { parseDateTimeLocal } from "./schedule";
import { parseMoneyInput } from "./money";
import { emailSignupToOwner } from "./signup-notify";
import { assertCanAddStaff, assertCanAddStore, loadOrgPlan } from "./org-plan";
import { contactSalesGpsMessage, remainingUserSlots, showVehicleGps } from "./plans";
import {
  ASSET_KIND,
  BUILTIN_ASSET_TYPES,
  ensureAssetTypes,
  isPivotAssetType,
  uniqueAssetTypeSlug,
} from "./assets";
import {
  assignCustomerAssetsToFarm,
  createFarmForCustomer,
  deleteFarmForCustomer,
  moveFarmToCustomer,
  parseFarmId,
  resolveFarmIdForCustomer,
} from "./farms";
import { ticketWhere } from "./scope";
import { officeFormBySlug, officeFormMessage } from "./office-forms";
import {
  ocrImageFromForm,
  readHandwrittenTicket,
  readHandwrittenTicketFile,
  visionOcrConfigured,
} from "./ticket-ocr";
import {
  addOrgOcrSamples,
  applyOrgOcrFromSignup,
  confirmOrgOcrBoxes,
  loadOrgOcrScanContext,
  markOrgOcrFieldListReviewed,
  markOrgOcrFirstScan,
  orgOcrIsOn,
  orgFormsIsOn,
  removeOrgOcrSample,
  saveOrgOcrTemplate,
  ticketSampleFilesFromForm,
} from "./ocr-samples";
import { parseOcrTemplateKey } from "./ocr-templates";

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function uniqueEmailError(error: unknown) {
  if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
    return "That email is already used in this company.";
  }
  return null;
}

async function sendFarmerContactInvite(
  input: {
    organizationId: string;
    organizationName: string;
    farmerId: string;
    name: string;
    email: string;
  },
  options: { force: boolean },
): Promise<{ welcome: WelcomeMailStatus | null } | { error: string }> {
  const email = input.email.toLowerCase();
  if (!email) return { welcome: null };

  const existing = await prisma.user.findFirst({
    where: { organizationId: input.organizationId, email },
  });
  if (existing) {
    if (existing.role !== ROLES.FARMER || existing.farmerId !== input.farmerId) {
      return { error: "That email is already used in this company." };
    }
    if (!options.force) return { welcome: null };
    if (existing.name !== input.name) {
      await prisma.user.update({ where: { id: existing.id }, data: { name: input.name } });
    }
    const welcome = await sendWelcomeLoginEmail({
      userId: existing.id,
      email: existing.email,
      name: input.name,
      organizationName: input.organizationName,
      hadPassword: false,
    });
    return { welcome };
  }

  const { hash, hadPassword } = await hashNewUserPassword("");
  let user;
  try {
    user = await prisma.user.create({
      data: {
        organizationId: input.organizationId,
        farmerId: input.farmerId,
        name: input.name,
        email,
        role: ROLES.FARMER,
        passwordHash: hash,
      },
    });
  } catch (error) {
    return { error: uniqueEmailError(error) ?? "Could not create a login for that contact. Try a different email." };
  }

  const welcome = await sendWelcomeLoginEmail({
    userId: user.id,
    email: user.email,
    name: user.name,
    organizationName: input.organizationName,
    hadPassword,
  });
  return { welcome };
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
  const locale = await readLocaleCookie();
  const user = await verifyLogin(email, password);
  if (!user) return { error: t(locale, "login.invalid") };
  if ("pending" in user) {
    return { error: t(locale, "login.pending") };
  }
  if ("rejected" in user) {
    return { error: t(locale, "login.rejected") };
  }
  if ("paused" in user) {
    return { error: t(locale, "login.paused") };
  }
  const saved = await loadUserLocale(user.userId);
  const nextLocale = saved !== "en" ? saved : locale;
  await saveUserLocale(user.userId, nextLocale);
  await writeLocaleCookie(nextLocale);
  await createSession(user);
  redirect(homePath(user.role));
}

export async function logoutAction() {
  const session = await getSession();
  await destroySession();
  if (session?.impersonatorId && (await getPlatformSession())) {
    redirect("/platform");
  }
  redirect("/login");
}

export async function setPasswordFromWelcomeAction(formData: FormData) {
  const token = formString(formData, "token");
  const password = formString(formData, "password");
  const confirm = formString(formData, "confirmPassword");
  if (!token) return { error: "This set-password link is missing." };
  if (password.length < 8) return { error: "Use a password with at least 8 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };

  const row = await userFromPasswordToken(token);
  if (!row) return { error: "This link is invalid or has expired. Request a new one from the login screen." };

  await prisma.user.update({
    where: { id: row.userId },
    data: { passwordHash: await bcrypt.hash(password, 10) },
  });
  await prisma.passwordResetToken.delete({ where: { id: row.id } });

  await createSession({
    userId: row.user.id,
    organizationId: row.user.organizationId,
    organizationName: row.user.organization.name,
    role: row.user.role as Role,
    farmerId: row.user.farmerId,
    name: row.user.name,
    email: row.user.email,
  });
  redirect(homePath(row.user.role));
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = formString(formData, "email").toLowerCase();
  if (!email) return { error: "Enter the email you use to sign in." };
  if (!mailIsConfigured()) {
    return {
      error:
        "Password reset email is not set up yet. Ask your dealer for a new password, or have them add EMAIL_FROM and mail settings.",
    };
  }

  const users = await prisma.user.findMany({
    where: { email },
    include: { organization: true },
  });
  for (const user of users) {
    await sendPasswordResetEmail({
      userId: user.id,
      email: user.email,
      name: user.name,
      organizationName: user.organization.name,
    });
  }
  redirect("/forgot?sent=1");
}

export async function signupAction(formData: FormData) {
  const company = formString(formData, "company");
  const name = formString(formData, "name");
  const title = formString(formData, "title");
  const email = formString(formData, "email").toLowerCase();
  const phone = formString(formData, "phone");
  const address = formString(formData, "address");
  const city = formString(formData, "city");
  const region = formString(formData, "region");
  const postalCode = formString(formData, "postalCode");
  const staffCount = formString(formData, "staffCount");
  const notes = formString(formData, "notes");
  const password = formString(formData, "password");
  if (!company || !name || !email || !phone || password.length < 8) {
    return { error: "Company, your name, email, phone, and an 8+ character password are required." };
  }

  let slug = slugify(company) || "company";
  const existing = await prisma.organization.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const org = await prisma.organization.create({
    data: {
      name: company,
      slug,
      paused: true,
      signupStatus: "PENDING",
      signupPhone: phone,
      signupTitle: title || null,
      signupAddress: address || null,
      signupCity: city || null,
      signupRegion: region || null,
      signupPostalCode: postalCode || null,
      signupStaffCount: staffCount || null,
      signupNotes: notes || null,
      users: {
        create: {
          name,
          email,
          role: ROLES.ADMIN,
          passwordHash: await bcrypt.hash(password, 10),
          phone: phone || null,
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
      assetTypes: {
        create: BUILTIN_ASSET_TYPES.map((type) => ({
          name: type.name,
          slug: type.slug,
          kind: type.kind,
          builtIn: true,
          sortOrder: type.sortOrder,
        })),
      },
    },
  });

  try {
    await applyOrgOcrFromSignup(org.id, formData);
  } catch {
    // signup still succeeds if sample photos fail
  }

  await emailSignupToOwner({
    company,
    name,
    title,
    email,
    phone,
    address,
    city,
    region,
    postalCode,
    staffCount,
    notes,
  });
  redirect("/signup/thanks");
}

export async function createFarmerAction(formData: FormData) {
  const session = await requireSession();
  if (session.role === ROLES.FARMER) return { error: "Ask the service company to add a customer." };

  const name = formString(formData, "name");
  const phone = formString(formData, "phone");
  const email = formString(formData, "email").toLowerCase();
  const address = formString(formData, "address");
  const loginEmail = formString(formData, "loginEmail").toLowerCase();
  const loginPassword = formString(formData, "loginPassword");
  if (!name) return { error: "Customer name is required." };
  if (loginEmail && loginPassword && loginPassword.length < 8) {
    return { error: "Login password must be at least 8 characters, or leave it blank." };
  }

  const farmer = await createFarmWithContact(session.organizationId, {
    name,
    address,
    contactName: formString(formData, "contactName"),
    phone: formString(formData, "contactPhone") || phone,
    email: formString(formData, "contactEmail").toLowerCase() || email,
    storeId: await resolveStoreId(session.organizationId, formString(formData, "storeId")),
  });

  const portalEmail = loginEmail || formString(formData, "contactEmail").toLowerCase();
  if (portalEmail) {
    const { hash, hadPassword } = await hashNewUserPassword(loginEmail ? loginPassword : "");
    let user;
    try {
      user = await prisma.user.create({
        data: {
          organizationId: session.organizationId,
          farmerId: farmer.id,
          name: formString(formData, "contactName") || name,
          email: portalEmail,
          role: ROLES.FARMER,
          passwordHash: hash,
        },
      });
    } catch (error) {
      return { error: uniqueEmailError(error) ?? "Could not create a login for that email. Try a different address." };
    }
    const welcome = await sendWelcomeLoginEmail({
      userId: user.id,
      email: user.email,
      name: user.name,
      organizationName: session.organizationName,
      hadPassword,
    });
    redirect(welcomeQuery(`/farmers/${farmer.id}`, welcome));
  }

  redirect(`/farmers/${farmer.id}`);
}

export async function addFarmerContactAction(formData: FormData) {
  const session = await requireSession();
  if (session.role === ROLES.FARMER) return { error: "Ask the service company to update customer contacts." };

  const farmerId = formString(formData, "farmerId");
  const name = formString(formData, "contactName");
  const email = formString(formData, "contactEmail").toLowerCase();
  const phone = formString(formData, "contactPhone");
  if (!name) return { error: "Contact name is required." };

  const farmer = await prisma.farmer.findFirst({
    where: { id: farmerId, organizationId: session.organizationId },
  });
  if (!farmer) return { error: "Customer not found." };

  const contact = await prisma.farmerContact.create({
    data: {
      farmerId,
      name,
      email: email || null,
      phone: phone || null,
    },
  });
  const invite = await sendFarmerContactInvite(
    {
      organizationId: session.organizationId,
      organizationName: session.organizationName,
      farmerId,
      name,
      email,
    },
    { force: false },
  );
  if ("error" in invite) return { error: invite.error };
  if (invite.welcome) {
    redirect(welcomeQuery(`/farmers/${farmerId}`, invite.welcome, { invite: contact.id }));
  }
  redirect(`/farmers/${farmerId}`);
}

export async function createFarmAction(formData: FormData) {
  const session = await requireSession();
  if (!isShopStaff(session.role)) return { error: "Customers cannot add farms." };

  const farmerId = formString(formData, "farmerId");
  const name = formString(formData, "name");
  const location = formString(formData, "location");
  if (!name) return { error: "Farm name is required." };

  const farmer = await prisma.farmer.findFirst({
    where: { id: farmerId, organizationId: session.organizationId },
  });
  if (!farmer) return { error: "Customer not found." };

  await createFarmForCustomer({
    organizationId: session.organizationId,
    farmerId,
    name,
    location,
  });
  redirect(`/farmers/${farmerId}`);
}

export async function assignCustomerAssetsToFarmAction(formData: FormData) {
  const session = await requireSession();
  if (!isShopStaff(session.role)) return { error: "Customers cannot assign assets to farms." };

  const farmerId = formString(formData, "farmerId");
  const farmMode = formString(formData, "farmMode") || "existing";
  const pivotIds = formData.getAll("pivotId").map((value) => String(value).trim()).filter(Boolean);
  const assetIds = formData.getAll("assetId").map((value) => String(value).trim()).filter(Boolean);
  if (!pivotIds.length && !assetIds.length) return { error: "Select at least one asset." };

  const farmer = await prisma.farmer.findFirst({
    where: { id: farmerId, organizationId: session.organizationId },
    select: { id: true },
  });
  if (!farmer) return { error: "Customer not found." };

  const assigned = await assignCustomerAssetsToFarm({
    organizationId: session.organizationId,
    farmerId,
    farmId: farmMode === "new" ? null : parseFarmId(formString(formData, "farmId")),
    newFarm:
      farmMode === "new"
        ? { name: formString(formData, "name"), location: formString(formData, "location") }
        : null,
    pivotIds,
    assetIds,
  });
  if (assigned.error) return { error: assigned.error };

  const returnFarmId = formString(formData, "returnFarmId");
  if (returnFarmId) redirect(`/farms/${returnFarmId}`);
  redirect(`/farmers/${farmerId}`);
}

export async function updateFarmAction(formData: FormData) {
  const session = await requireSession();
  if (!isShopStaff(session.role)) return { error: "Customers cannot edit farms." };

  const farmId = formString(formData, "farmId");
  const name = formString(formData, "name");
  const location = formString(formData, "location");
  const farmerId = formString(formData, "farmerId");
  const primaryContactId = formString(formData, "primaryContactId");
  if (!name) return { error: "Farm name is required." };

  const farm = await prisma.farm.findFirst({
    where: { id: farmId, organizationId: session.organizationId },
  });
  if (!farm) return { error: "Farm not found." };

  const ownerId = farmerId && farmerId !== farm.farmerId ? farmerId : farm.farmerId;
  let nextContactId: string | null = null;
  if (primaryContactId && ownerId === farm.farmerId) {
    const contact = await prisma.farmerContact.findFirst({
      where: { id: primaryContactId, farmerId: farm.farmerId },
      select: { id: true },
    });
    if (!contact) return { error: "Contact not found for this customer." };
    nextContactId = contact.id;
  }

  await prisma.farm.update({
    where: { id: farmId },
    data: {
      name,
      location: location || null,
    },
  });
  await prisma.$executeRaw`UPDATE Farm SET primaryContactId = ${nextContactId} WHERE id = ${farmId}`;

  if (farmerId && farmerId !== farm.farmerId) {
    const moved = await moveFarmToCustomer({
      organizationId: session.organizationId,
      farmId,
      toFarmerId: farmerId,
    });
    if (moved.error) return { error: moved.error };
  }

  redirect(`/farms/${farmId}`);
}

export async function deleteFarmAction(formData: FormData) {
  const session = await requireSession();
  if (!canDeleteRecords(session.role)) return { error: "Only company admins can delete." };

  const farmId = formString(formData, "farmId");
  const deleted = await deleteFarmForCustomer({
    organizationId: session.organizationId,
    farmId,
  });
  if (deleted.error || !deleted.farm) return { error: deleted.error ?? "Farm not found." };

  redirect("/farms");
}

export async function updateFarmerAction(formData: FormData) {
  const session = await requireSession();
  if (session.role === ROLES.FARMER) return { error: "Ask the service company to update the customer." };

  const farmerId = formString(formData, "farmerId");
  const name = formString(formData, "name");
  const address = formString(formData, "address");
  if (!name) return { error: "Customer name is required." };

  const farmer = await prisma.farmer.findFirst({
    where: { id: farmerId, organizationId: session.organizationId },
  });
  if (!farmer) return { error: "Customer not found." };

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
    return { error: "You can only set the store for your customer." };
  }
  if (session.role !== ROLES.FARMER && !isShopStaff(session.role)) {
    return { error: "You cannot set a customer store." };
  }

  const farmer = await prisma.farmer.findFirst({
    where: { id: farmerId, organizationId: session.organizationId },
  });
  if (!farmer) return { error: "Customer not found." };

  await prisma.farmer.update({
    where: { id: farmerId },
    data: { storeId: await resolveStoreId(session.organizationId, formString(formData, "storeId")) },
  });
  redirect(session.role === ROLES.FARMER ? "/dashboard" : `/farmers/${farmerId}`);
}

export async function updateFarmerContactAction(formData: FormData) {
  const session = await requireSession();
  if (session.role === ROLES.FARMER) return { error: "Ask the service company to update customer contacts." };

  const contactId = formString(formData, "contactId");
  const name = formString(formData, "contactName");
  const email = formString(formData, "contactEmail").toLowerCase();
  const phone = formString(formData, "contactPhone");
  if (!name) return { error: "Contact name is required." };

  const contact = await prisma.farmerContact.findFirst({
    where: { id: contactId, farmer: { organizationId: session.organizationId } },
  });
  if (!contact) return { error: "Contact not found." };

  const invite = await sendFarmerContactInvite(
    {
      organizationId: session.organizationId,
      organizationName: session.organizationName,
      farmerId: contact.farmerId,
      name,
      email,
    },
    { force: false },
  );
  if ("error" in invite) return { error: invite.error };

  await prisma.farmerContact.update({
    where: { id: contactId },
    data: { name, email: email || null, phone: phone || null },
  });
  if (invite.welcome) {
    redirect(welcomeQuery(`/farmers/${contact.farmerId}`, invite.welcome, { invite: contact.id }));
  }
  redirect(`/farmers/${contact.farmerId}`);
}

export async function resendFarmerContactInviteAction(formData: FormData) {
  const session = await requireSession();
  if (session.role === ROLES.FARMER) return { error: "Ask the service company to send customer invites." };

  const contactId = formString(formData, "contactId");
  const contact = await prisma.farmerContact.findFirst({
    where: { id: contactId, farmer: { organizationId: session.organizationId } },
  });
  if (!contact) return { error: "Contact not found." };
  if (!contact.email) return { error: "Add an email to this contact before sending an invite." };

  const invite = await sendFarmerContactInvite(
    {
      organizationId: session.organizationId,
      organizationName: session.organizationName,
      farmerId: contact.farmerId,
      name: contact.name,
      email: contact.email,
    },
    { force: true },
  );
  if ("error" in invite) return { error: invite.error };
  if (!invite.welcome) return { error: "Could not send that invite." };
  redirect(welcomeQuery(`/farmers/${contact.farmerId}`, invite.welcome, { invite: contact.id }));
}

export async function createTechnicianAction(formData: FormData) {
  const session = await requireSession();
  if (!canAddTechnicians(session.role)) return { error: "Only managers and admins can add technicians." };

  const name = formString(formData, "name");
  const email = formString(formData, "email").toLowerCase();
  const password = formString(formData, "password");
  const phone = formString(formData, "phone");
  const revealVehicleNumber = formString(formData, "revealVehicleNumber");
  if (!name || !email) return { error: "Name and email are required." };
  if (password && password.length < 8) return { error: "Password must be at least 8 characters, or leave it blank." };

  const seat = await assertCanAddStaff(session.organizationId);
  if ("error" in seat && seat.error) return { error: seat.error };

  const { hash, hadPassword } = await hashNewUserPassword(password);
  let user;
  try {
    user = await prisma.user.create({
      data: {
        organizationId: session.organizationId,
        name,
        email,
        role: ROLES.TECHNICIAN,
        passwordHash: hash,
        phone: phone || null,
        revealVehicleNumber: revealVehicleNumber || null,
        storeId: await resolveStoreId(session.organizationId, formString(formData, "storeId")),
      },
    });
  } catch (error) {
    return { error: uniqueEmailError(error) ?? "Could not save that technician. Try a different email." };
  }
  let welcome: "sent" | "skipped" | "failed" = "skipped";
  try {
    welcome = await sendWelcomeLoginEmail({
      userId: user.id,
      email: user.email,
      name: user.name,
      organizationName: session.organizationName,
      hadPassword,
    });
  } catch {
    welcome = "failed";
  }
  redirect(welcomeQuery("/technicians", welcome));
}

export async function createStaffAction(formData: FormData) {
  const session = await requireSession();
  if (!canManageShopStaff(session.role)) return { error: "Only managers and admins can add staff." };

  const name = formString(formData, "name");
  const email = formString(formData, "email").toLowerCase();
  const password = formString(formData, "password");
  const phone = formString(formData, "phone");
  const revealVehicleNumber = formString(formData, "revealVehicleNumber");
  const role = formString(formData, "role");
  if (!name || !email) return { error: "Name and email are required." };
  if (password && password.length < 8) return { error: "Password must be at least 8 characters, or leave it blank." };
  if (!canEditStaffMember(session.role, role)) {
    return { error: "You cannot add staff with that role." };
  }

  const seat = await assertCanAddStaff(session.organizationId);
  if ("error" in seat && seat.error) return { error: seat.error };

  const { hash, hadPassword } = await hashNewUserPassword(password);
  let user;
  try {
    user = await prisma.user.create({
      data: {
        organizationId: session.organizationId,
        name,
        email,
        role,
        passwordHash: hash,
        phone: phone || null,
        revealVehicleNumber: role === ROLES.TECHNICIAN ? revealVehicleNumber || null : null,
        storeId: await resolveStoreId(session.organizationId, formString(formData, "storeId")),
      },
    });
  } catch (error) {
    return { error: uniqueEmailError(error) ?? "Could not save that staff login. Try a different email." };
  }
  let welcome: "sent" | "skipped" | "failed" = "skipped";
  try {
    welcome = await sendWelcomeLoginEmail({
      userId: user.id,
      email: user.email,
      name: user.name,
      organizationName: session.organizationName,
      hadPassword,
    });
  } catch {
    welcome = "failed";
  }
  redirect(welcomeQuery("/staff", welcome));
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
    return { error: "No staff found. Use columns Name, Email, Role (Admin, Manager, Office/Clerical, or Technician)." };
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const adminCount = await prisma.user.count({
    where: { organizationId: session.organizationId, role: ROLES.ADMIN },
  });
  let remainingAdmins = adminCount;
  const planLoaded = await loadOrgPlan(session.organizationId);
  let staffCount = await prisma.user.count({
    where: {
      organizationId: session.organizationId,
      role: { in: [...SHOP_STAFF_ROLES] },
    },
  });
  const userSlotsLeft = planLoaded ? remainingUserSlots(planLoaded.org, staffCount) : null;

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
    if (userSlotsLeft != null && created >= userSlotsLeft) {
      skipped += 1;
      continue;
    }
    const password = row.password && row.password.length >= 8 ? row.password : defaultPassword;
    const { hash, hadPassword } = await hashNewUserPassword(password);
    const user = await prisma.user.create({
      data: {
        organizationId: session.organizationId,
        name: row.name,
        email: row.email,
        role: row.role,
        passwordHash: hash,
        phone: row.phone,
        revealVehicleNumber: row.role === ROLES.TECHNICIAN ? row.revealVehicleNumber : null,
      },
    });
    await sendWelcomeLoginEmail({
      userId: user.id,
      email: user.email,
      name: user.name,
      organizationName: session.organizationName,
      hadPassword,
    });
    if (row.role === ROLES.ADMIN) remainingAdmins += 1;
    created += 1;
  }

  redirect(`/staff?imported=${created}&updated=${updated}&skipped=${skipped}`);
}

export async function createManagerAction(formData: FormData) {
  const session = await requireSession();
  if (!canEditStaffMember(session.role, ROLES.MANAGER)) {
    return { error: "Only managers and admins can add managers." };
  }

  const name = formString(formData, "name");
  const email = formString(formData, "email").toLowerCase();
  const password = formString(formData, "password");
  const phone = formString(formData, "phone");
  if (!name || !email) return { error: "Name and email are required." };
  if (password && password.length < 8) return { error: "Password must be at least 8 characters, or leave it blank." };

  const seat = await assertCanAddStaff(session.organizationId);
  if ("error" in seat && seat.error) return { error: seat.error };

  const { hash, hadPassword } = await hashNewUserPassword(password);
  let user;
  try {
    user = await prisma.user.create({
      data: {
        organizationId: session.organizationId,
        name,
        email,
        role: ROLES.MANAGER,
        passwordHash: hash,
        phone: phone || null,
        storeId: await resolveStoreId(session.organizationId, formString(formData, "storeId")),
      },
    });
  } catch (error) {
    return { error: uniqueEmailError(error) ?? "Could not save that manager. Try a different email." };
  }
  let welcome: "sent" | "skipped" | "failed" = "skipped";
  try {
    welcome = await sendWelcomeLoginEmail({
      userId: user.id,
      email: user.email,
      name: user.name,
      organizationName: session.organizationName,
      hadPassword,
    });
  } catch {
    welcome = "failed";
  }
  redirect(welcomeQuery("/managers", welcome));
}

export async function deleteFarmerAction(formData: FormData) {
  const session = await requireSession();
  if (!canDeleteRecords(session.role)) return { error: "Only company admins can delete." };
  const farmerId = formString(formData, "farmerId");
  const farmer = await prisma.farmer.findFirst({
    where: { id: farmerId, organizationId: session.organizationId },
    include: { pivots: { include: { documents: { select: { id: true } } } } },
  });
  if (!farmer) return { error: "Customer not found." };
  const documentIds = farmer.pivots.flatMap((pivot) => pivot.documents.map((document) => document.id));
  await prisma.farmer.delete({ where: { id: farmerId } });
  await Promise.all(documentIds.map((documentId) => removePivotDocumentFile(documentId)));
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
    include: { documents: { select: { id: true } } },
  });
  if (!pivot) return { error: "Pivot not found." };
  await prisma.pivot.delete({ where: { id: pivotId } });
  await Promise.all(pivot.documents.map((document) => removePivotDocumentFile(document.id)));
  redirect("/pivots");
}

export async function deleteTicketAction(formData: FormData) {
  const session = await requireSession();
  if (!canDeleteRecords(session.role)) return { error: "Only company admins can delete." };
  const ticketId = formString(formData, "ticketId");
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, organizationId: session.organizationId },
  });
  if (!ticket) return { error: "Work order not found." };
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

export async function updateStaffStoreAction(formData: FormData) {
  const session = await requireSession();
  const userId = formString(formData, "userId");
  const nextPath = formString(formData, "next");
  const allowedNext = ["/staff", "/technicians", "/managers"];
  const destination = allowedNext.includes(nextPath) ? nextPath : "/staff";

  const user = await prisma.user.findFirst({
    where: { id: userId, organizationId: session.organizationId },
  });
  if (!user || !isShopStaffRole(user.role)) return { error: "Staff member not found." };
  if (!canEditStaffMember(session.role, user.role)) {
    return { error: "You cannot update this staff member." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { storeId: await resolveStoreId(session.organizationId, formString(formData, "storeId")) },
  });
  redirect(destination);
}

export async function updateStaffAction(formData: FormData) {
  const session = await requireSession();
  if (!canManageShopStaff(session.role)) return { error: "Only managers and admins can edit staff." };

  const userId = formString(formData, "userId");
  const nextPath = formString(formData, "next");
  const allowedNext = ["/staff", "/technicians", "/managers"];
  const destination = allowedNext.includes(nextPath) ? nextPath : "/staff";
  const name = formString(formData, "name");
  const email = formString(formData, "email").toLowerCase();
  const password = formString(formData, "password");
  const phone = formString(formData, "phone");
  const role = formString(formData, "role");
  const revealVehicleNumber = formString(formData, "revealVehicleNumber");
  if (!name || !email) return { error: "Name and email are required." };
  if (password && password.length < 8) return { error: "New password must be at least 8 characters." };
  if (!canEditStaffMember(session.role, role)) {
    return { error: "You cannot assign that role." };
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, organizationId: session.organizationId },
  });
  if (!user || !isShopStaffRole(user.role)) return { error: "Staff member not found." };
  if (!canEditStaffMember(session.role, user.role)) {
    return { error: "You cannot edit this staff member." };
  }

  if (user.role === ROLES.ADMIN && role !== ROLES.ADMIN) {
    const admins = await prisma.user.count({
      where: { organizationId: session.organizationId, role: ROLES.ADMIN },
    });
    if (admins <= 1) return { error: "Keep at least one company admin." };
  }

  const emailTaken = await prisma.user.findFirst({
    where: {
      organizationId: session.organizationId,
      email,
      NOT: { id: userId },
    },
    select: { id: true },
  });
  if (emailTaken) return { error: "That email is already in use." };

  await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      email,
      role,
      phone: phone || null,
      revealVehicleNumber: role === ROLES.TECHNICIAN ? revealVehicleNumber || null : null,
      storeId: await resolveStoreId(session.organizationId, formString(formData, "storeId")),
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
    },
  });
  redirect(destination);
}

export async function createStoreAction(formData: FormData) {
  const session = await requireSession();
  if (!isAdmin(session.role)) return { error: "Only company admins can add stores." };

  const name = formString(formData, "name");
  const address = formString(formData, "address");
  const phone = formString(formData, "phone");
  if (!name) return { error: "Store name is required." };

  const cap = await assertCanAddStore(session.organizationId);
  if ("error" in cap && cap.error) return { error: cap.error };

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
  if (session.role === ROLES.FARMER) return { error: "Customers cannot add pivots." };

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
    if (!farmerName) return { error: "Customer name is required." };
    const created = await createFarmWithContact(session.organizationId, {
      name: farmerName,
      address: formString(formData, "farmerAddress"),
      contactName: formString(formData, "farmerContactName"),
      phone: formString(formData, "farmerPhone"),
      email: formString(formData, "farmerEmail").toLowerCase(),
    });
    farmerId = created.id;
  }

  if (!farmerId) return { error: "Select a customer or add a new one." };

  const farmer = await prisma.farmer.findFirst({
    where: { id: farmerId, organizationId: session.organizationId },
  });
  if (!farmer) return { error: "Customer not found." };

  const farm = await resolveFarmIdForCustomer(session.organizationId, farmerId, parseFarmId(formString(formData, "farmId")));
  if (farm.error) return { error: farm.error };

  const pivot = await prisma.pivot.create({
    data: {
      organizationId: session.organizationId,
      farmerId,
      farmId: farm.farmId,
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
  if (session.role === ROLES.FARMER) return { error: "Customers cannot edit pivots." };

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
  if (!farmer) return { error: "Customer not found." };

  const farm = await resolveFarmIdForCustomer(session.organizationId, farmerId, parseFarmId(formString(formData, "farmId")));
  if (farm.error) return { error: farm.error };

  await prisma.pivot.update({
    where: { id: pivotId },
    data: {
      farmerId,
      farmId: farm.farmId,
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

export async function uploadPivotDocumentsAction(formData: FormData) {
  const session = await requireSession();
  if (!isShopStaff(session.role)) return { error: "Customers cannot upload pivot documents." };

  const pivotId = formString(formData, "pivotId");
  const files = documentFilesFromForm(formData);
  if (files.length === 0) return { error: "Choose at least one file to upload." };

  const pivot = await prisma.pivot.findFirst({
    where: { id: pivotId, organizationId: session.organizationId },
  });
  if (!pivot) return { error: "Pivot not found." };

  const saved = await savePivotDocuments({
    files,
    pivotId,
    userId: session.userId,
  });
  if (saved.error) return { error: saved.error };

  redirect(safePivotReturnTo(formString(formData, "returnTo"), `/pivots/${pivotId}`));
}

export async function deletePivotDocumentAction(formData: FormData) {
  const session = await requireSession();
  if (!isShopStaff(session.role)) return { error: "Customers cannot delete pivot documents." };

  const documentId = formString(formData, "documentId");
  const document = await prisma.pivotDocument.findFirst({
    where: {
      id: documentId,
      pivot: { organizationId: session.organizationId },
    },
  });
  if (!document) return { error: "Document not found." };

  await prisma.pivotDocument.delete({ where: { id: documentId } });
  await removePivotDocumentFile(documentId);
  redirect(safePivotReturnTo(formString(formData, "returnTo"), `/pivots/${document.pivotId}`));
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
  let asset = null as Awaited<ReturnType<typeof prisma.asset.findFirst>>;
  const types = await ensureAssetTypes(session.organizationId);
  const typeSlug = formString(formData, "assetTypeSlug");
  const selectedType = types.find((type) => type.slug === typeSlug) ?? types.find(isPivotAssetType) ?? types[0];
  const creatingPivot = !selectedType || isPivotAssetType(selectedType);

  if (siteMode === "new") {
    if (session.role === ROLES.FARMER && !session.farmerId) {
      return { error: "Your customer account is not linked." };
    }

    const assetName = formString(formData, "assetName") || formString(formData, "pivotName");
    const serialNumber = formString(formData, "serialNumber");
    const mapsInput = formString(formData, "mapsInput");
    const latitude = Number(formString(formData, "latitude"));
    const longitude = Number(formString(formData, "longitude"));
    const parsed = mapsInput ? parseMapsLocation(mapsInput) : null;
    const lat = parsed?.latitude ?? latitude;
    const lng = parsed?.longitude ?? longitude;
    if (!assetName || Number.isNaN(lat) || Number.isNaN(lng)) {
      return { error: "Asset name and a map location are required." };
    }

    let farmerId = formString(formData, "farmerId");
    if (session.role === ROLES.FARMER) {
      farmerId = session.farmerId ?? "";
    } else if (formString(formData, "farmerMode") === "new") {
      const farmerName = formString(formData, "farmerName");
      if (!farmerName) return { error: "Customer name is required." };
      const farmer = await createFarmWithContact(session.organizationId, {
        name: farmerName,
        address: formString(formData, "farmerAddress"),
        contactName: formString(formData, "farmerContactName"),
        phone: formString(formData, "farmerPhone"),
        email: formString(formData, "farmerEmail").toLowerCase(),
      });
      farmerId = farmer.id;
    }

    if (!farmerId) return { error: "Select a customer or add a new one." };
    const farmer = await prisma.farmer.findFirst({
      where: { id: farmerId, organizationId: session.organizationId },
    });
    if (!farmer) return { error: "Customer not found." };

    if (creatingPivot) {
      pivot = await prisma.pivot.create({
        data: {
          organizationId: session.organizationId,
          farmerId,
          name: assetName,
          latitude: lat,
          longitude: lng,
          serialNumber: serialNumber || null,
          locationNote: mapsInput || null,
        },
      });
    } else {
      if (!selectedType) return { error: "Choose an asset type." };
      const farm = await resolveFarmIdForCustomer(session.organizationId, farmerId, parseFarmId(formString(formData, "farmId")));
      if (farm.error) return { error: farm.error };
      asset = await prisma.asset.create({
        data: {
          organizationId: session.organizationId,
          assetTypeId: selectedType.id,
          farmerId,
          farmId: farm.farmId,
          name: assetName,
          latitude: lat,
          longitude: lng,
          serialNumber: serialNumber || null,
          locationNote: mapsInput || null,
        },
      });
    }
  } else if (creatingPivot) {
    const pivotId = formString(formData, "pivotId");
    if (!pivotId) return { error: "Select an asset or add a new location." };
    pivot = await prisma.pivot.findFirst({
      where: { id: pivotId, organizationId: session.organizationId },
    });
    if (!pivot) return { error: "Asset not found." };
    if (session.role === ROLES.FARMER && session.farmerId !== pivot.farmerId) {
      return { error: "You can only open work orders on your own equipment." };
    }
  } else {
    const assetId = formString(formData, "assetId");
    if (!assetId) return { error: "Select an asset or add a new location." };
    asset = await prisma.asset.findFirst({
      where: { id: assetId, organizationId: session.organizationId },
      include: { assetType: true },
    });
    if (!asset) return { error: "Asset not found." };
    if (session.role === ROLES.FARMER && session.farmerId !== asset.farmerId) {
      return { error: "You can only open work orders on your own equipment." };
    }
  }

  if (!pivot && !asset) return { error: "Select an asset or add a new location." };

  const photos = photoFilesFromForm(formData);
  const photoCheck = validatePhotoFiles(photos);
  if (photoCheck.error) return photoCheck;

  let assigned: string | null = technicianId;
  if (session.role === ROLES.FARMER) assigned = null;
  else if (session.role === ROLES.TECHNICIAN) assigned = session.userId;
  else if (!canAssignTickets(session.role)) assigned = null;

  const siteFarmerId = pivot?.farmerId ?? asset!.farmerId;
  const farmer = await prisma.farmer.findFirst({
    where: { id: siteFarmerId, organizationId: session.organizationId },
    select: { storeId: true },
  });
  const storeId =
    session.role === ROLES.FARMER
      ? farmer?.storeId ?? null
      : await resolveStoreId(session.organizationId, formString(formData, "storeId"));

  const ticket = await openServiceTicket({
    organizationId: session.organizationId,
    farmerId: siteFarmerId,
    pivotId: pivot?.id ?? null,
    assetId: asset?.id ?? null,
    technicianId: assigned,
    storeId,
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
  if (!ticket) return { error: "Work order not found." };

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
        description: `${ticket.description}\n\n[Customer update ${stamp}]\n${note}`,
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
    return { error: "This work order is not assigned to you." };
  }

  if (!TICKET_STATUSES.includes(status)) return { error: "Invalid status." };

  const invoiceNumber = formString(formData, "invoiceNumber");
  const invoiceAmount = parseMoneyInput(formString(formData, "invoiceAmount"));
  if (requiresInvoice(status)) {
    if (!invoiceNumber) {
      return { error: "An invoice number is required before a work order can be closed." };
    }
    if (invoiceAmount == null) {
      return { error: "An invoice amount is required before a work order can be closed." };
    }
    const clash = await prisma.ticket.findFirst({
      where: {
        organizationId: session.organizationId,
        invoiceNumber,
        NOT: { id: ticketId },
      },
    });
    if (clash) {
      return { error: `Invoice ${invoiceNumber} is already on work order #${clash.number}.` };
    }
  }

  const nextTech =
    canAssignTickets(session.role)
      ? technicianId || null
      : ticket.technicianId;

  const previousTech = ticket.technicianId;
  const previousStatus = ticket.status;
  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status,
      technicianId: nextTech,
      invoiceNumber: invoiceNumber || ticket.invoiceNumber,
      invoiceAmount: requiresInvoice(status) ? invoiceAmount : ticket.invoiceAmount,
      ...(formData.has("scheduledAt")
        ? { scheduledAt: parseDateTimeLocal(formString(formData, "scheduledAt")) }
        : {}),
      closedAt: requiresInvoice(status) ? (ticket.closedAt ?? new Date()) : ticket.closedAt,
      ...(isShopStaff(session.role) && formData.has("storeId")
        ? { storeId: await resolveStoreId(session.organizationId, formString(formData, "storeId")) }
        : {}),
    },
  });
  if (isFinishedStatus(status) || status === "REPAIR_DONE") {
    await closeOpenSiteVisits(ticketId);
  }

  const note = message || `Status set to ${STATUS_LABELS[status] ?? status.replaceAll("_", " ").toLowerCase()}.`;
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
  if (nextTech && nextTech !== previousTech) {
    await notifyTicketSms({
      organizationId: session.organizationId,
      ticketId,
      kind: "assigned",
      actorUserId: session.userId,
      note,
    });
  }
  if (status !== previousStatus) {
    await notifyTicketSms({
      organizationId: session.organizationId,
      ticketId,
      kind: "updated",
      actorUserId: session.userId,
      note,
    });
  }
  if (status === "REPAIR_DONE" && previousStatus !== "REPAIR_DONE") {
    await notifyFarmerRepairDone({
      organizationId: session.organizationId,
      ticketId,
    });
  }
  redirect(`/tickets/${ticketId}`);
}

export async function assignTicketAction(formData: FormData) {
  const session = await requireSession();
  if (session.role === ROLES.FARMER) return { error: "Customers cannot dispatch work orders." };

  const ticketId = formString(formData, "ticketId");
  const technicianId = formString(formData, "technicianId");
  const status = formString(formData, "status");

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, organizationId: session.organizationId },
  });
  if (!ticket) return { error: "Work order not found." };

  if (session.role === ROLES.TECHNICIAN && ticket.technicianId !== session.userId) {
    return { error: "This work order is not assigned to you." };
  }

  const nextTech =
    canAssignTickets(session.role) ? technicianId || null : ticket.technicianId;
  let nextStatus: string = TICKET_STATUSES.includes(status as TicketStatus) ? status : ticket.status;
  if (nextTech && nextStatus === "OPEN") nextStatus = "ASSIGNED";
  if (!nextTech && nextStatus === "ASSIGNED") nextStatus = "OPEN";
  if (requiresInvoice(nextStatus) && (!ticket.invoiceNumber || ticket.invoiceAmount == null)) {
    return { error: "Close this work order from the work order page and enter an invoice number and amount." };
  }

  const previousTech = ticket.technicianId;
  const previousStatus = ticket.status;
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
  if (nextTech && nextTech !== previousTech) {
    await notifyTicketSms({
      organizationId: session.organizationId,
      ticketId,
      kind: "assigned",
      actorUserId: session.userId,
      note: "Updated from the dispatch board.",
    });
  }
  if (nextStatus !== previousStatus) {
    await notifyTicketSms({
      organizationId: session.organizationId,
      ticketId,
      kind: "updated",
      actorUserId: session.userId,
      note: "Updated from the dispatch board.",
    });
  }
  if (nextStatus === "REPAIR_DONE" && previousStatus !== "REPAIR_DONE") {
    await notifyFarmerRepairDone({
      organizationId: session.organizationId,
      ticketId,
    });
  }
  redirect("/dispatch");
}

export async function addTicketPartAction(formData: FormData) {
  const session = await requireSession();
  if (session.role === ROLES.FARMER) return { error: "Customers can view parts but not log them." };

  const ticketId = formString(formData, "ticketId");
  const catalogPartId = formString(formData, "catalogPartId");
  const customName = formString(formData, "name");
  const quantity = Number(formString(formData, "quantity") || "1");
  const skuInput = formString(formData, "sku");

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, organizationId: session.organizationId },
  });
  if (!ticket) return { error: "Work order not found." };
  if (session.role === ROLES.TECHNICIAN && ticket.technicianId !== session.userId) {
    return { error: "This work order is not assigned to you." };
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
  redirect(`/tickets/${ticketId}`);
}

export async function createCatalogPartAction(formData: FormData) {
  const session = await requireSession();
  if (!canManageParts(session.role)) return { error: "Only admins and managers can add catalog parts." };

  const name = formString(formData, "name");
  const sku = formString(formData, "sku");
  const description = formString(formData, "description");
  const itemType = formString(formData, "itemType");
  const price = parseMoneyInput(formString(formData, "price"));
  const cost = parseMoneyInput(formString(formData, "cost"));
  const quantityOnHand = parseMoneyInput(formString(formData, "quantityOnHand"));
  if (!name) return { error: "Part name is required." };

  await prisma.catalogPart.upsert({
    where: { organizationId_name: { organizationId: session.organizationId, name } },
    create: {
      organizationId: session.organizationId,
      name,
      sku: sku || null,
      description: description || null,
      itemType: itemType || null,
      price,
      cost,
      quantityOnHand,
      source: "MANUAL",
    },
    update: {
      sku: sku || null,
      description: description || null,
      itemType: itemType || null,
      price,
      cost,
      quantityOnHand,
      active: true,
    },
  });
  redirect(partsListHref(formData));
}

export async function updateCatalogPartAction(formData: FormData) {
  const session = await requireSession();
  if (!canManageParts(session.role)) return { error: "Only admins and managers can edit catalog parts." };

  const id = formString(formData, "id");
  const name = formString(formData, "name");
  const sku = formString(formData, "sku");
  const description = formString(formData, "description");
  const itemType = formString(formData, "itemType");
  const price = parseMoneyInput(formString(formData, "price"));
  const cost = parseMoneyInput(formString(formData, "cost"));
  const quantityOnHand = parseMoneyInput(formString(formData, "quantityOnHand"));
  if (!name) return { error: "Part name is required." };

  const part = await prisma.catalogPart.findFirst({
    where: { id, organizationId: session.organizationId },
  });
  if (!part) return { error: "Part not found." };

  const clash = await prisma.catalogPart.findFirst({
    where: { organizationId: session.organizationId, name, NOT: { id } },
    select: { id: true },
  });
  if (clash) return { error: "Another part already uses that name." };

  await prisma.catalogPart.update({
    where: { id },
    data: {
      name,
      sku: sku || null,
      description: description || null,
      itemType: itemType || null,
      price,
      cost,
      quantityOnHand,
      active: true,
    },
  });
  redirect(partsListHref(formData));
}

function partsListHref(formData: FormData) {
  const q = formString(formData, "q");
  const page = formString(formData, "page");
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (page && page !== "1") params.set("page", page);
  const qs = params.toString();
  return qs ? `/parts?${qs}` : "/parts";
}

export async function importCatalogPartsBatchAction(
  parts: unknown,
): Promise<{ created: number; updated: number } | { error: string }> {
  const session = await requireSession();
  if (!canManageParts(session.role)) return { error: "Only admins and managers can import parts." };
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

export async function addTicketLaborAction(formData: FormData) {
  const session = await requireSession();
  if (session.role === ROLES.FARMER) return { error: "Customers can view labor but not log it." };

  const ticketId = formString(formData, "ticketId");
  const catalogLaborId = formString(formData, "catalogLaborId");
  const customName = formString(formData, "name");
  const hours = Number(formString(formData, "hours") || "1");
  const skuInput = formString(formData, "sku");

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, organizationId: session.organizationId },
  });
  if (!ticket) return { error: "Work order not found." };
  if (session.role === ROLES.TECHNICIAN && ticket.technicianId !== session.userId) {
    return { error: "This work order is not assigned to you." };
  }
  if (Number.isNaN(hours) || hours <= 0) {
    return { error: "Hours must be greater than 0." };
  }

  let name = customName;
  let sku: string | null = skuInput || null;
  let unitRate: number | null = null;
  let catalogId: string | null = null;

  if (catalogLaborId) {
    const catalog = await prisma.catalogLabor.findFirst({
      where: { id: catalogLaborId, organizationId: session.organizationId, active: true },
    });
    if (!catalog) return { error: "That labor item was not found." };
    name = catalog.name;
    sku = catalog.sku;
    unitRate = catalog.rate;
    catalogId = catalog.id;
  }

  if (!name) return { error: "Pick a labor item or type a custom name." };

  await prisma.ticketLabor.create({
    data: {
      ticketId,
      userId: session.userId,
      catalogLaborId: catalogId,
      name,
      hours,
      sku,
      unitRate,
    },
  });
  await prisma.ticketUpdate.create({
    data: {
      ticketId,
      userId: session.userId,
      message: `Labor logged: ${hours} hr × ${name}${sku ? ` (${sku})` : ""}.`,
    },
  });
  redirect(`/tickets/${ticketId}`);
}

export async function addTicketEquipmentAction(formData: FormData) {
  const session = await requireSession();
  if (session.role === ROLES.FARMER) return { error: "Customers can view equipment but not log it." };

  const ticketId = formString(formData, "ticketId");
  const catalogEquipmentId = formString(formData, "catalogEquipmentId");
  const customName = formString(formData, "name");
  const hours = Number(formString(formData, "hours") || "1");
  const skuInput = formString(formData, "sku");

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, organizationId: session.organizationId },
  });
  if (!ticket) return { error: "Work order not found." };
  if (session.role === ROLES.TECHNICIAN && ticket.technicianId !== session.userId) {
    return { error: "This work order is not assigned to you." };
  }
  if (Number.isNaN(hours) || hours <= 0) {
    return { error: "Hours must be greater than 0." };
  }

  let name = customName;
  let sku: string | null = skuInput || null;
  let unitRate: number | null = null;
  let catalogId: string | null = null;

  if (catalogEquipmentId) {
    const catalog = await prisma.catalogEquipment.findFirst({
      where: { id: catalogEquipmentId, organizationId: session.organizationId, active: true },
    });
    if (!catalog) return { error: "That equipment item was not found." };
    name = catalog.name;
    sku = catalog.sku;
    unitRate = catalog.rate;
    catalogId = catalog.id;
  }

  if (!name) return { error: "Pick equipment or type a custom name." };

  await prisma.ticketEquipment.create({
    data: {
      ticketId,
      userId: session.userId,
      catalogEquipmentId: catalogId,
      name,
      hours,
      sku,
      unitRate,
    },
  });
  await prisma.ticketUpdate.create({
    data: {
      ticketId,
      userId: session.userId,
      message: `Equipment used: ${hours} hr × ${name}${sku ? ` (${sku})` : ""}.`,
    },
  });
  redirect(`/tickets/${ticketId}`);
}

export async function quickCreateTicketCatalogAction(formData: FormData) {
  const session = await requireSession();
  if (session.role === ROLES.FARMER) {
    return { error: "Customers can view the catalog but cannot add to it." };
  }

  const ticketId = formString(formData, "ticketId");
  const kind = formString(formData, "kind");
  const name = formString(formData, "name");
  const sku = formString(formData, "sku") || null;
  const amount = Number(formString(formData, "amount") || "1");
  const money = parseMoneyInput(formString(formData, "price"));

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, organizationId: session.organizationId },
  });
  if (!ticket) return { error: "Work order not found." };
  if (session.role === ROLES.TECHNICIAN && ticket.technicianId !== session.userId) {
    return { error: "This work order is not assigned to you." };
  }
  if (!name) return { error: "Name is required." };
  if (Number.isNaN(amount) || amount <= 0) {
    return { error: kind === "part" ? "Quantity must be greater than 0." : "Hours must be greater than 0." };
  }
  if (kind !== "part" && kind !== "labor" && kind !== "equipment") {
    return { error: "Choose part, labor, or equipment." };
  }

  if (kind === "part") {
    const catalog = await prisma.catalogPart.upsert({
      where: { organizationId_name: { organizationId: session.organizationId, name } },
      create: {
        organizationId: session.organizationId,
        name,
        sku,
        price: money,
        source: "MANUAL",
      },
      update: {
        sku: sku || undefined,
        price: money ?? undefined,
        active: true,
      },
    });
    await prisma.ticketPart.create({
      data: {
        ticketId,
        userId: session.userId,
        catalogPartId: catalog.id,
        name: catalog.name,
        quantity: amount,
        sku: catalog.sku,
        unitPrice: catalog.price,
      },
    });
    await prisma.ticketUpdate.create({
      data: {
        ticketId,
        userId: session.userId,
        message: `Parts logged: ${amount} × ${catalog.name}${catalog.sku ? ` (${catalog.sku})` : ""}.`,
      },
    });
  } else if (kind === "labor") {
    const catalog = await prisma.catalogLabor.upsert({
      where: { organizationId_name: { organizationId: session.organizationId, name } },
      create: {
        organizationId: session.organizationId,
        name,
        sku,
        rate: money,
        itemType: "Service",
        source: "MANUAL",
      },
      update: {
        sku: sku || undefined,
        rate: money ?? undefined,
        active: true,
      },
    });
    await prisma.ticketLabor.create({
      data: {
        ticketId,
        userId: session.userId,
        catalogLaborId: catalog.id,
        name: catalog.name,
        hours: amount,
        sku: catalog.sku,
        unitRate: catalog.rate,
      },
    });
    await prisma.ticketUpdate.create({
      data: {
        ticketId,
        userId: session.userId,
        message: `Labor logged: ${amount} hr × ${catalog.name}${catalog.sku ? ` (${catalog.sku})` : ""}.`,
      },
    });
  } else {
    const catalog = await prisma.catalogEquipment.upsert({
      where: { organizationId_name: { organizationId: session.organizationId, name } },
      create: {
        organizationId: session.organizationId,
        name,
        sku,
        rate: money,
        itemType: "Equipment",
        source: "MANUAL",
      },
      update: {
        sku: sku || undefined,
        rate: money ?? undefined,
        active: true,
      },
    });
    await prisma.ticketEquipment.create({
      data: {
        ticketId,
        userId: session.userId,
        catalogEquipmentId: catalog.id,
        name: catalog.name,
        hours: amount,
        sku: catalog.sku,
        unitRate: catalog.rate,
      },
    });
    await prisma.ticketUpdate.create({
      data: {
        ticketId,
        userId: session.userId,
        message: `Equipment used: ${amount} hr × ${catalog.name}${catalog.sku ? ` (${catalog.sku})` : ""}.`,
      },
    });
  }

  redirect(`/tickets/${ticketId}`);
}

async function requireTicketLineEdit(ticketId: string) {
  const session = await requireSession();
  if (session.role === ROLES.FARMER) {
    return { error: "Customers can view this but cannot change it." as const };
  }
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, organizationId: session.organizationId },
  });
  if (!ticket) return { error: "Work order not found." as const };
  if (session.role === ROLES.TECHNICIAN && ticket.technicianId !== session.userId) {
    return { error: "This work order is not assigned to you." as const };
  }
  return { session, ticket };
}

export async function updateTicketPartAction(formData: FormData) {
  const session = await requireSession();
  const id = formString(formData, "id");
  const quantity = Number(formString(formData, "quantity"));
  const part = await prisma.ticketPart.findFirst({
    where: { id },
    include: { ticket: { select: { id: true, organizationId: true, technicianId: true } } },
  });
  if (!part || part.ticket.organizationId !== session.organizationId) return { error: "Part not found." };
  const access = await requireTicketLineEdit(part.ticketId);
  if ("error" in access) return access;
  if (Number.isNaN(quantity) || quantity <= 0) return { error: "Quantity must be greater than 0." };

  await prisma.ticketPart.update({ where: { id }, data: { quantity } });
  await prisma.ticketUpdate.create({
    data: {
      ticketId: part.ticketId,
      userId: session.userId,
      message: `Parts updated: ${quantity} × ${part.name}${part.sku ? ` (${part.sku})` : ""}.`,
    },
  });
  redirect(`/tickets/${part.ticketId}`);
}

export async function deleteTicketPartAction(formData: FormData) {
  const session = await requireSession();
  const id = formString(formData, "id");
  const part = await prisma.ticketPart.findFirst({
    where: { id },
    include: { ticket: { select: { organizationId: true, technicianId: true } } },
  });
  if (!part || part.ticket.organizationId !== session.organizationId) return { error: "Part not found." };
  const access = await requireTicketLineEdit(part.ticketId);
  if ("error" in access) return access;

  await prisma.ticketPart.delete({ where: { id } });
  await prisma.ticketUpdate.create({
    data: {
      ticketId: part.ticketId,
      userId: session.userId,
      message: `Parts removed: ${part.quantity} × ${part.name}${part.sku ? ` (${part.sku})` : ""}.`,
    },
  });
  redirect(`/tickets/${part.ticketId}`);
}

export async function updateTicketLaborAction(formData: FormData) {
  const session = await requireSession();
  const id = formString(formData, "id");
  const hours = Number(formString(formData, "hours"));
  const item = await prisma.ticketLabor.findFirst({
    where: { id },
    include: { ticket: { select: { organizationId: true, technicianId: true } } },
  });
  if (!item || item.ticket.organizationId !== session.organizationId) return { error: "Labor not found." };
  const access = await requireTicketLineEdit(item.ticketId);
  if ("error" in access) return access;
  if (Number.isNaN(hours) || hours <= 0) return { error: "Hours must be greater than 0." };

  await prisma.ticketLabor.update({ where: { id }, data: { hours } });
  await prisma.ticketUpdate.create({
    data: {
      ticketId: item.ticketId,
      userId: session.userId,
      message: `Labor updated: ${hours} hr × ${item.name}${item.sku ? ` (${item.sku})` : ""}.`,
    },
  });
  redirect(`/tickets/${item.ticketId}`);
}

export async function deleteTicketLaborAction(formData: FormData) {
  const session = await requireSession();
  const id = formString(formData, "id");
  const item = await prisma.ticketLabor.findFirst({
    where: { id },
    include: { ticket: { select: { organizationId: true, technicianId: true } } },
  });
  if (!item || item.ticket.organizationId !== session.organizationId) return { error: "Labor not found." };
  const access = await requireTicketLineEdit(item.ticketId);
  if ("error" in access) return access;

  await prisma.ticketLabor.delete({ where: { id } });
  await prisma.ticketUpdate.create({
    data: {
      ticketId: item.ticketId,
      userId: session.userId,
      message: `Labor removed: ${item.hours} hr × ${item.name}${item.sku ? ` (${item.sku})` : ""}.`,
    },
  });
  redirect(`/tickets/${item.ticketId}`);
}

export async function updateTicketEquipmentAction(formData: FormData) {
  const session = await requireSession();
  const id = formString(formData, "id");
  const hours = Number(formString(formData, "hours"));
  const item = await prisma.ticketEquipment.findFirst({
    where: { id },
    include: { ticket: { select: { organizationId: true, technicianId: true } } },
  });
  if (!item || item.ticket.organizationId !== session.organizationId) return { error: "Equipment not found." };
  const access = await requireTicketLineEdit(item.ticketId);
  if ("error" in access) return access;
  if (Number.isNaN(hours) || hours <= 0) return { error: "Hours must be greater than 0." };

  await prisma.ticketEquipment.update({ where: { id }, data: { hours } });
  await prisma.ticketUpdate.create({
    data: {
      ticketId: item.ticketId,
      userId: session.userId,
      message: `Equipment updated: ${hours} hr × ${item.name}${item.sku ? ` (${item.sku})` : ""}.`,
    },
  });
  redirect(`/tickets/${item.ticketId}`);
}

export async function deleteTicketEquipmentAction(formData: FormData) {
  const session = await requireSession();
  const id = formString(formData, "id");
  const item = await prisma.ticketEquipment.findFirst({
    where: { id },
    include: { ticket: { select: { organizationId: true, technicianId: true } } },
  });
  if (!item || item.ticket.organizationId !== session.organizationId) return { error: "Equipment not found." };
  const access = await requireTicketLineEdit(item.ticketId);
  if ("error" in access) return access;

  await prisma.ticketEquipment.delete({ where: { id } });
  await prisma.ticketUpdate.create({
    data: {
      ticketId: item.ticketId,
      userId: session.userId,
      message: `Equipment removed: ${item.hours} hr × ${item.name}${item.sku ? ` (${item.sku})` : ""}.`,
    },
  });
  redirect(`/tickets/${item.ticketId}`);
}

export async function createCatalogEquipmentAction(formData: FormData) {
  const session = await requireSession();
  if (!canManageParts(session.role)) return { error: "Only admins and managers can add equipment." };

  const name = formString(formData, "name");
  const sku = formString(formData, "sku");
  const description = formString(formData, "description");
  const itemType = formString(formData, "itemType");
  const rate = formString(formData, "rate");
  if (!name) return { error: "Equipment name is required." };

  await prisma.catalogEquipment.upsert({
    where: { organizationId_name: { organizationId: session.organizationId, name } },
    create: {
      organizationId: session.organizationId,
      name,
      sku: sku || null,
      description: description || null,
      itemType: itemType || "Equipment",
      rate: rate ? Number(rate) : null,
      source: "MANUAL",
    },
    update: {
      sku: sku || null,
      description: description || null,
      itemType: itemType || "Equipment",
      rate: rate ? Number(rate) : null,
      active: true,
    },
  });
  redirect("/equipment");
}

export async function importCatalogEquipmentBatchAction(
  items: unknown,
): Promise<{ created: number; updated: number } | { error: string }> {
  const session = await requireSession();
  if (!canManageParts(session.role)) return { error: "Only admins and managers can import equipment." };
  if (!Array.isArray(items) || items.length === 0) {
    return { error: "No equipment items in this batch." };
  }
  if (items.length > 400) return { error: "Each import batch must be 400 equipment items or fewer." };

  try {
    return await importCatalogEquipmentBatch(session.organizationId, items);
  } catch (error) {
    console.error("Equipment import batch failed", error);
    return { error: "This batch failed to save. Try the import again; already-imported names will update." };
  }
}

export async function createCatalogLaborAction(formData: FormData) {
  const session = await requireSession();
  if (session.role !== ROLES.ADMIN) return { error: "Only company admins can add labor items." };

  const name = formString(formData, "name");
  const sku = formString(formData, "sku");
  const description = formString(formData, "description");
  const itemType = formString(formData, "itemType");
  const rate = formString(formData, "rate");
  if (!name) return { error: "Labor name is required." };

  await prisma.catalogLabor.upsert({
    where: { organizationId_name: { organizationId: session.organizationId, name } },
    create: {
      organizationId: session.organizationId,
      name,
      sku: sku || null,
      description: description || null,
      itemType: itemType || "Service",
      rate: rate ? Number(rate) : null,
      source: "MANUAL",
    },
    update: {
      sku: sku || null,
      description: description || null,
      itemType: itemType || "Service",
      rate: rate ? Number(rate) : null,
      active: true,
    },
  });
  redirect("/labor");
}

export async function importCatalogLaborBatchAction(
  items: unknown,
): Promise<{ created: number; updated: number } | { error: string }> {
  const session = await requireSession();
  if (session.role !== ROLES.ADMIN) return { error: "Only company admins can import labor." };
  if (!Array.isArray(items) || items.length === 0) {
    return { error: "No labor items in this batch." };
  }
  if (items.length > 400) return { error: "Each import batch must be 400 labor items or fewer." };

  try {
    return await importCatalogLaborBatch(session.organizationId, items);
  } catch (error) {
    console.error("Labor import batch failed", error);
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

async function openMaintenanceTicketForPivot(input: {
  organizationId: string;
  userId: string;
  role: string;
  pivot: { id: string; name: string; farmerId: string };
}) {
  const actor = await prisma.user.findFirst({
    where: { id: input.userId },
    select: { storeId: true },
  });
  const farm = await prisma.farmer.findFirst({
    where: { id: input.pivot.farmerId },
    select: { storeId: true, name: true },
  });
  const technicianId = input.role === ROLES.TECHNICIAN ? input.userId : null;
  const ticket = await openServiceTicket({
    organizationId: input.organizationId,
    farmerId: input.pivot.farmerId,
    pivotId: input.pivot.id,
    technicianId,
    storeId: actor?.storeId ?? farm?.storeId ?? null,
    userId: input.userId,
    title: `${STARTUP_SEASON_YEAR} maintenance: ${input.pivot.name}`,
    description: `${STARTUP_SEASON_YEAR} maintenance for ${input.pivot.name}${farm?.name ? ` at ${farm.name}` : ""}.`,
    priority: "NORMAL",
  });
  await notifyTicketSms({
    organizationId: input.organizationId,
    ticketId: ticket.id,
    kind: technicianId ? "assigned" : "opened",
    actorUserId: input.userId,
    note: ticket.description,
  });
  return ticket;
}

export async function startStartupInspectionAction(formData: FormData) {
  const session = await requireSession();
  if (session.role === ROLES.FARMER) return { error: "Customers cannot start maintenance." };

  const pivotId = formString(formData, "pivotId");
  const pivot = await prisma.pivot.findFirst({
    where: { id: pivotId, organizationId: session.organizationId },
  });
  if (!pivot) return { error: "Pivot not found." };

  let inspection = await prisma.startupInspection.findUnique({
    where: { pivotId_seasonYear: { pivotId, seasonYear: STARTUP_SEASON_YEAR } },
  });

  if (!inspection) {
    const templates = await ensureStartupTemplates(session.organizationId);
    if (templates.length === 0) return { error: "Add at least one checklist item before starting maintenance." };
    inspection = await prisma.startupInspection.create({
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
  }

  let ticketId = inspection.ticketId;
  if (!ticketId) {
    const ticket = await openMaintenanceTicketForPivot({
      organizationId: session.organizationId,
      userId: session.userId,
      role: session.role,
      pivot,
    });
    ticketId = ticket.id;
    await prisma.startupInspection.update({
      where: { id: inspection.id },
      data: { ticketId, inspectorId: session.userId },
    });
  }

  redirect(`/tickets/${ticketId}`);
}

export async function saveStartupChecksAction(formData: FormData) {
  const session = await requireSession();
  if (session.role === ROLES.FARMER) return { error: "Customers cannot update inspections." };

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
  if (failed.length > 0) {
    const failLabels = failed.map((item) => item.label).join(", ");
    const failNote = `Maintenance failed on: ${failLabels}.`;
    if (!ticketId) {
      const ticket = await openMaintenanceTicketForPivot({
        organizationId: session.organizationId,
        userId: session.userId,
        role: session.role,
        pivot: inspection.pivot,
      });
      ticketId = ticket.id;
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { priority: "HIGH", description: failNote },
      });
    } else if (inspection.status !== INSPECTION_STATUS.FAILED) {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { priority: "HIGH" },
      });
      await prisma.ticketUpdate.create({
        data: {
          ticketId,
          userId: session.userId,
          message: failNote,
        },
      });
      await notifyTicketSms({
        organizationId: session.organizationId,
        ticketId,
        kind: "updated",
        actorUserId: session.userId,
        note: failNote,
      });
    }
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
      storeId: await resolveStoreId(session.organizationId, formString(formData, "storeId")),
    },
  });
  redirect("/technicians");
}

export async function saveRevealSettingsAction(formData: FormData) {
  const session = await requireSession();
  if (session.role !== ROLES.ADMIN) return { error: "Only company admins can save Reveal settings." };
  const plan = await loadOrgPlan(session.organizationId);
  if (!plan || !showVehicleGps(plan.org)) {
    return { error: plan ? contactSalesGpsMessage(plan.org) : "Company not found." };
  }

  const appId = normalizeRevealAppId(formString(formData, "revealAppId"));
  const username = formString(formData, "revealUsername");
  const password = formString(formData, "revealPassword");
  const region = formString(formData, "revealRegion") === "EU" ? REVEAL_EU : REVEAL_US;
  const meters = Number(formString(formData, "revealOnsiteMeters") || "400");
  if (!appId || !username) {
    return { error: "App ID and Reveal integration username are required." };
  }
  if (/[=,]/.test(appId) || /atmosphere_app_id/i.test(appId) || /\sBearer\s/i.test(appId)) {
    return {
      error:
        "Paste only the App ID (starts with fleetmatics-p-us-). Do not paste Atmosphere, Bearer, or the whole Authorization header.",
    };
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
  try {
    await syncRevealVehicles(session.organizationId);
  } catch {
    // Credentials are saved even if the first vehicle pull fails.
  }
  redirect("/reveal");
}

export async function testRevealConnectionAction() {
  const session = await requireSession();
  if (session.role !== ROLES.ADMIN) return { error: "Only company admins can test Reveal." };
  const plan = await loadOrgPlan(session.organizationId);
  if (!plan || !showVehicleGps(plan.org)) {
    return { error: plan ? contactSalesGpsMessage(plan.org) : "Company not found." };
  }
  try {
    const vehicles = await syncRevealVehicles(session.organizationId);
    return { ok: `Connected. ${vehicles.length} vehicle(s) saved to Settings → Vehicles.` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Reveal connection failed." };
  }
}

export async function syncRevealVehiclesAction() {
  const session = await requireSession();
  if (session.role !== ROLES.ADMIN) return { error: "Only company admins can refresh Verizon vehicles." };
  const plan = await loadOrgPlan(session.organizationId);
  if (!plan || !showVehicleGps(plan.org)) {
    return { error: plan ? contactSalesGpsMessage(plan.org) : "Company not found." };
  }
  let vehicles;
  try {
    vehicles = await syncRevealVehicles(session.organizationId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not refresh Verizon vehicles." };
  }
  redirect(`/vehicles?synced=${vehicles.length}`);
}

export async function toggleRevealVehicleMapAction(formData: FormData) {
  const session = await requireSession();
  if (!canAddTechnicians(session.role)) return { error: "You cannot change map visibility." };
  const id = formString(formData, "vehicleId");
  const showOnMap = formString(formData, "showOnMap") === "1";
  if (!id) return { error: "Missing vehicle." };
  const vehicle = await prisma.revealVehicle.findFirst({
    where: { id, organizationId: session.organizationId },
  });
  if (!vehicle) return { error: "Vehicle not found." };
  await prisma.revealVehicle.update({
    where: { id: vehicle.id },
    data: { showOnMap },
  });
}

export async function updateRevealVehicleStoreAction(formData: FormData) {
  const session = await requireSession();
  if (!canAddTechnicians(session.role)) return { error: "You cannot assign vehicle stores." };
  const id = formString(formData, "vehicleId");
  if (!id) return { error: "Missing vehicle." };
  const vehicle = await prisma.revealVehicle.findFirst({
    where: { id, organizationId: session.organizationId },
  });
  if (!vehicle) return { error: "Vehicle not found." };
  await prisma.revealVehicle.update({
    where: { id: vehicle.id },
    data: { storeId: await resolveStoreId(session.organizationId, formString(formData, "storeId")) },
  });
}

export async function currentUser() {
  return getSession();
}

export async function saveDispatchViewAction(formData: FormData) {
  const session = await requireSession();
  if (!canEditDeskSettings(session.role)) return { error: "Only managers and company admins can change dispatch view." };
  const dispatchView = parseDispatchView(formString(formData, "dispatchView"));
  await saveUserDispatchView(session.userId, dispatchView);
  redirect("/settings");
}

export async function saveLocaleAction(formData: FormData) {
  const locale = parseLocale(formString(formData, "locale"));
  const next = safeNextPath(formString(formData, "next"), "/settings");
  await writeLocaleCookie(locale);
  const session = await getSession();
  if (session) await saveUserLocale(session.userId, locale);
  redirect(next);
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

export async function saveTicketFormTemplateAction(formData: FormData) {
  const session = await requireSession();
  if (!isAdmin(session.role)) return { error: "Only company admins can change the paper ticket form." };
  const templateKey = parseOcrTemplateKey(formString(formData, "ocrTemplateKey"));
  const fieldNotes = formString(formData, "ocrFieldNotes").slice(0, 2000);
  await saveOrgOcrTemplate(session.organizationId, templateKey, fieldNotes);
  redirect("/company/ticket-form");
}

export async function uploadTicketFormSamplesAction(formData: FormData) {
  const session = await requireSession();
  if (!isAdmin(session.role)) return { error: "Only company admins can change the paper ticket form." };
  const files = ticketSampleFilesFromForm(formData);
  if (!files.length) return { error: "Choose 1 or 2 photos of your paper ticket." };
  const saved = await addOrgOcrSamples(session.organizationId, files);
  if (saved.error) return { error: saved.error };
  redirect("/company/ticket-form");
}

export async function removeTicketFormSampleAction(formData: FormData) {
  const session = await requireSession();
  if (!isAdmin(session.role)) return { error: "Only company admins can change the paper ticket form." };
  const sampleId = formString(formData, "sampleId");
  if (!sampleId) return { error: "Sample not found." };
  const result = await removeOrgOcrSample(session.organizationId, sampleId);
  if (result.error) return { error: result.error };
  redirect("/company/ticket-form");
}

export async function confirmOcrBoxesAction(_formData: FormData) {
  const session = await requireSession();
  if (!isAdmin(session.role)) return { error: "Only company admins can confirm the paper ticket boxes." };
  await confirmOrgOcrBoxes(session.organizationId);
  redirect("/company/ticket-form");
}

export async function markOcrFieldListReviewedAction(_formData: FormData) {
  const session = await requireSession();
  if (!isAdmin(session.role)) return { error: "Only company admins can finish the field list." };
  await markOrgOcrFieldListReviewed(session.organizationId);
  redirect("/company/ticket-form");
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

export async function createAssetTypeAction(formData: FormData) {
  const session = await requireSession();
  if (!isShopStaff(session.role)) return { error: "Customers cannot add asset types." };

  const name = formString(formData, "name");
  if (!name) return { error: "Type name is required." };

  const types = await ensureAssetTypes(session.organizationId);
  const slug = uniqueAssetTypeSlug(
    name,
    new Set(types.map((type) => type.slug)),
  );
  if (types.some((type) => type.name.toLowerCase() === name.toLowerCase() || type.slug === slugify(name))) {
    return { error: "An asset type with that name already exists." };
  }

  await prisma.assetType.create({
    data: {
      organizationId: session.organizationId,
      name,
      slug,
      kind: ASSET_KIND.GENERIC,
      builtIn: false,
      sortOrder: Math.max(100, ...types.map((type) => type.sortOrder)) + 1,
    },
  });
  redirect("/assets/types");
}

export async function deleteAssetTypeAction(formData: FormData) {
  const session = await requireSession();
  if (!canDeleteRecords(session.role)) return { error: "Only company admins can delete asset types." };

  const assetTypeId = formString(formData, "assetTypeId");
  const type = await prisma.assetType.findFirst({
    where: { id: assetTypeId, organizationId: session.organizationId },
  });
  if (!type) return { error: "Asset type not found." };
  if (type.builtIn || isPivotAssetType(type)) return { error: "Built-in asset types cannot be deleted." };

  await prisma.assetType.delete({ where: { id: assetTypeId } });
  redirect("/assets/types");
}

export async function createAssetAction(formData: FormData) {
  const session = await requireSession();
  if (session.role === ROLES.FARMER) return { error: "Customers cannot add assets." };

  const name = formString(formData, "name");
  const serialNumber = formString(formData, "serialNumber");
  const locationNote = formString(formData, "locationNote");
  const notes = formString(formData, "notes");
  const mapsInput = formString(formData, "mapsInput");
  const latitude = Number(formString(formData, "latitude"));
  const longitude = Number(formString(formData, "longitude"));
  const parsed = mapsInput ? parseMapsLocation(mapsInput) : null;
  const lat = parsed?.latitude ?? latitude;
  const lng = parsed?.longitude ?? longitude;

  if (!name || Number.isNaN(lat) || Number.isNaN(lng)) {
    return { error: "Name and a map location are required." };
  }

  const types = await ensureAssetTypes(session.organizationId);
  const assetTypeId = formString(formData, "assetTypeId");
  const type = types.find((item) => item.id === assetTypeId);
  if (!type || isPivotAssetType(type)) return { error: "Choose a valid asset type." };

  let farmerId = formString(formData, "farmerId");
  if (formString(formData, "farmerMode") === "new") {
    const farmerName = formString(formData, "farmerName");
    if (!farmerName) return { error: "Customer name is required." };
    const created = await createFarmWithContact(session.organizationId, {
      name: farmerName,
      address: formString(formData, "farmerAddress"),
      contactName: formString(formData, "farmerContactName"),
      phone: formString(formData, "farmerPhone"),
      email: formString(formData, "farmerEmail").toLowerCase(),
    });
    farmerId = created.id;
  }

  if (!farmerId) return { error: "Select a customer or add a new one." };

  const farmer = await prisma.farmer.findFirst({
    where: { id: farmerId, organizationId: session.organizationId },
  });
  if (!farmer) return { error: "Customer not found." };

  const farm = await resolveFarmIdForCustomer(session.organizationId, farmerId, parseFarmId(formString(formData, "farmId")));
  if (farm.error) return { error: farm.error };

  const asset = await prisma.asset.create({
    data: {
      organizationId: session.organizationId,
      assetTypeId: type.id,
      farmerId,
      farmId: farm.farmId,
      name,
      latitude: lat,
      longitude: lng,
      serialNumber: serialNumber || null,
      locationNote: locationNote || null,
      notes: notes || null,
    },
  });
  redirect(`/assets/${asset.id}`);
}

export async function updateAssetAction(formData: FormData) {
  const session = await requireSession();
  if (session.role === ROLES.FARMER) return { error: "Customers cannot edit assets." };

  const assetId = formString(formData, "assetId");
  const name = formString(formData, "name");
  const serialNumber = formString(formData, "serialNumber");
  const locationNote = formString(formData, "locationNote");
  const notes = formString(formData, "notes");
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

  const asset = await prisma.asset.findFirst({
    where: { id: assetId, organizationId: session.organizationId },
  });
  if (!asset) return { error: "Asset not found." };

  const farmer = await prisma.farmer.findFirst({
    where: { id: farmerId, organizationId: session.organizationId },
  });
  if (!farmer) return { error: "Customer not found." };

  const farm = await resolveFarmIdForCustomer(session.organizationId, farmerId, parseFarmId(formString(formData, "farmId")));
  if (farm.error) return { error: farm.error };

  await prisma.asset.update({
    where: { id: assetId },
    data: {
      farmerId,
      farmId: farm.farmId,
      name,
      latitude: lat,
      longitude: lng,
      serialNumber: serialNumber || null,
      locationNote: locationNote || null,
      notes: notes || null,
    },
  });
  redirect(`/assets/${assetId}`);
}

export async function deleteAssetAction(formData: FormData) {
  const session = await requireSession();
  if (!canDeleteRecords(session.role)) return { error: "Only company admins can delete." };

  const assetId = formString(formData, "assetId");
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, organizationId: session.organizationId },
    include: { assetType: true },
  });
  if (!asset) return { error: "Asset not found." };

  await prisma.asset.delete({ where: { id: assetId } });
  redirect(`/assets?type=${encodeURIComponent(asset.assetType.slug)}`);
}

export async function attachOfficeFormToTicketAction(formData: FormData) {
  const session = await requireSession();
  if (!isShopStaff(session.role)) return { error: "Not allowed." };
  if (!(await orgFormsIsOn(session.organizationId))) {
    return { error: "Office forms are not on for this company yet." };
  }

  const ticketId = formString(formData, "ticketId");
  const slug = formString(formData, "formSlug");
  const form = officeFormBySlug(slug);
  if (!form) return { error: "Form not found." };
  if (!ticketId) return { error: "Choose an open work order." };

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, ...ticketWhere(session) },
  });
  if (!ticket) return { error: "Work order not found." };
  if (isFinishedStatus(ticket.status)) return { error: "That work order is already closed." };

  const locale = await getRequestLocale();
  const title = t(locale, form.titleKey);
  const message = officeFormMessage(title, formData);

  await prisma.ticketUpdate.create({
    data: { ticketId: ticket.id, userId: session.userId, message },
  });
  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { updatedAt: new Date() },
  });
  redirect(`/tickets/${ticket.id}`);
}

export async function scanHandwrittenTicketAction(formData: FormData) {
  const session = await requireSession();
  if (!isShopStaff(session.role)) return { error: "Not allowed." };
  if (!(await orgOcrIsOn(session.organizationId))) {
    return { error: "Handwritten import is not on for this company yet." };
  }
  if (!visionOcrConfigured()) {
    return { error: "Handwritten import is not configured. Add OPENAI_API_KEY on the server, then try again." };
  }

  const photoId = formString(formData, "photoId");
  const context = await loadOrgOcrScanContext(session.organizationId);
  try {
    if (photoId) {
      const photo = await prisma.ticketPhoto.findFirst({
        where: { id: photoId, ticket: ticketWhere(session) },
      });
      if (!photo) return { error: "Photo not found." };
      const bytes = await readTicketPhotoFile(photo.id);
      const draft = await readHandwrittenTicket({
        bytes,
        mimeType: photo.mimeType || "image/jpeg",
        ...context,
      });
      await markOrgOcrFirstScan(session.organizationId);
      return { draft };
    }
    const file = ocrImageFromForm(formData);
    if (!file) return { error: "Choose a photo of the handwritten ticket." };
    const draft = await readHandwrittenTicketFile(file, context);
    await markOrgOcrFirstScan(session.organizationId);
    return { draft };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "The scan failed." };
  }
}

function ocrLinesFromForm(formData: FormData, prefix: "parts" | "labor" | "equipment") {
  const count = Number(formString(formData, `${prefix}Count`) || "0");
  const rows: { quantity: number; name: string; sku: string }[] = [];
  for (let i = 0; i < count && i < 40; i += 1) {
    const name = formString(formData, `${prefix}.${i}.name`);
    if (!name) continue;
    const quantity = Number(formString(formData, `${prefix}.${i}.quantity`) || "1");
    rows.push({
      name,
      sku: formString(formData, `${prefix}.${i}.sku`),
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    });
  }
  return rows;
}

async function matchCatalogPart(organizationId: string, sku: string, name: string) {
  if (sku) {
    const bySku = await prisma.catalogPart.findFirst({
      where: { organizationId, active: true, sku },
    });
    if (bySku) return bySku;
  }
  return prisma.catalogPart.findFirst({
    where: { organizationId, active: true, name },
  });
}

async function matchCatalogLabor(organizationId: string, sku: string, name: string) {
  if (sku) {
    const bySku = await prisma.catalogLabor.findFirst({
      where: { organizationId, active: true, sku },
    });
    if (bySku) return bySku;
  }
  return prisma.catalogLabor.findFirst({
    where: { organizationId, active: true, name },
  });
}

async function matchCatalogEquipment(organizationId: string, sku: string, name: string) {
  if (sku) {
    const bySku = await prisma.catalogEquipment.findFirst({
      where: { organizationId, active: true, sku },
    });
    if (bySku) return bySku;
  }
  return prisma.catalogEquipment.findFirst({
    where: { organizationId, active: true, name },
  });
}

export async function applyHandwrittenTicketAction(formData: FormData) {
  const session = await requireSession();
  if (!isShopStaff(session.role)) return { error: "Not allowed." };
  if (!(await orgOcrIsOn(session.organizationId))) {
    return { error: "Handwritten import is not on for this company yet." };
  }

  const ticketId = formString(formData, "ticketId");
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, ...ticketWhere(session) },
  });
  if (!ticket) return { error: "Work order not found." };
  if (session.role === ROLES.TECHNICIAN && ticket.technicianId !== session.userId) {
    return { error: "This work order is not assigned to you." };
  }

  const title = formString(formData, "title");
  const description = formString(formData, "description");
  const technicianName = formString(formData, "technician");
  const invoiceNumber = formString(formData, "invoiceNumber");
  const invoiceAmount = parseMoneyInput(formString(formData, "invoiceAmount"));
  const customer = formString(formData, "customer");
  const jobSite = formString(formData, "jobSite");
  const date = formString(formData, "date");
  const rawText = formString(formData, "rawText");
  const paperNumber = formString(formData, "paperNumber");
  const farmName = formString(formData, "farmName");
  const problem = formString(formData, "problem");
  const servicePerformed = formString(formData, "servicePerformed");
  const unitType = formString(formData, "unitType");
  const make = formString(formData, "make");
  const model = formString(formData, "model");
  const ageOfEq = formString(formData, "ageOfEq");
  const crew = formString(formData, "crew");
  const startTime = formString(formData, "startTime");
  const stopTime = formString(formData, "stopTime");
  const laborHours = formString(formData, "laborHours");
  const warranty = formString(formData, "warranty");
  const replaceTitle = formString(formData, "replaceTitle") === "on";
  const applyInvoice = formString(formData, "applyInvoice") === "on";
  const applyTech = formString(formData, "applyTech") === "on";
  const parts = ocrLinesFromForm(formData, "parts");
  const labor = ocrLinesFromForm(formData, "labor");
  const equipment = ocrLinesFromForm(formData, "equipment");

  const header = [
    "Imported from a handwritten SERVICE ORDER (check the values).",
    paperNumber ? `Paper # ${paperNumber}` : "",
    customer ? `Bill to: ${customer}` : "",
    farmName ? `Farm name: ${farmName}` : "",
    jobSite ? `Job / site: ${jobSite}` : "",
    date ? `Date requested: ${date}` : "",
    technicianName ? `Tech on paper: ${technicianName}` : "",
    crew ? `Crew: ${crew}` : "",
    [startTime, stopTime].filter(Boolean).length ? `Times: ${startTime || "?"} – ${stopTime || "?"}` : "",
    laborHours ? `Labor hours: ${laborHours}` : "",
    unitType ? `Unit: ${[unitType, formString(formData, "unitId")].filter(Boolean).join(" ")}` : "",
    make || model ? `Make/model: ${[make, model].filter(Boolean).join(" ")}` : "",
    ageOfEq ? `Age of eq: ${ageOfEq}` : "",
    warranty ? `Hold for warranty: ${warranty}` : "",
    problem ? `Describe problem: ${problem}` : "",
    servicePerformed ? `Service performed: ${servicePerformed}` : "",
    description,
    rawText && rawText !== description ? `Transcription:\n${rawText}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const photos = photoFilesFromForm(formData);
  const photoCheck = validatePhotoFiles(photos);
  if (photoCheck.error) return photoCheck;

  const update = await prisma.ticketUpdate.create({
    data: { ticketId: ticket.id, userId: session.userId, message: header || "Imported from a handwritten ticket." },
  });
  const saved = await saveTicketPhotos({
    files: photos,
    ticketId: ticket.id,
    updateId: update.id,
    userId: session.userId,
  });
  if (saved.error) return saved;

  for (const row of parts) {
    const catalog = await matchCatalogPart(session.organizationId, row.sku, row.name);
    await prisma.ticketPart.create({
      data: {
        ticketId: ticket.id,
        userId: session.userId,
        catalogPartId: catalog?.id ?? null,
        name: catalog?.name ?? row.name,
        quantity: row.quantity,
        sku: catalog?.sku ?? (row.sku || null),
        unitPrice: catalog?.price ?? null,
      },
    });
  }
  for (const row of labor) {
    const catalog = await matchCatalogLabor(session.organizationId, row.sku, row.name);
    await prisma.ticketLabor.create({
      data: {
        ticketId: ticket.id,
        userId: session.userId,
        catalogLaborId: catalog?.id ?? null,
        name: catalog?.name ?? row.name,
        hours: row.quantity,
        sku: catalog?.sku ?? (row.sku || null),
        unitRate: catalog?.rate ?? null,
      },
    });
  }
  for (const row of equipment) {
    const catalog = await matchCatalogEquipment(session.organizationId, row.sku, row.name);
    await prisma.ticketEquipment.create({
      data: {
        ticketId: ticket.id,
        userId: session.userId,
        catalogEquipmentId: catalog?.id ?? null,
        name: catalog?.name ?? row.name,
        hours: row.quantity,
        sku: catalog?.sku ?? (row.sku || null),
        unitRate: catalog?.rate ?? null,
      },
    });
  }

  let technicianId = ticket.technicianId;
  if (applyTech && technicianName) {
    const tech = await prisma.user.findFirst({
      where: {
        organizationId: session.organizationId,
        role: ROLES.TECHNICIAN,
        name: { equals: technicianName },
      },
    });
    if (tech) technicianId = tech.id;
  }

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      ...(replaceTitle && title ? { title } : {}),
      ...(applyInvoice && invoiceNumber && !ticket.invoiceNumber
        ? { invoiceNumber, invoiceAmount: invoiceAmount ?? ticket.invoiceAmount }
        : {}),
      ...(technicianId !== ticket.technicianId
        ? { technicianId, status: ticket.status === "OPEN" ? "ASSIGNED" : ticket.status }
        : {}),
    },
  });

  redirect(`/tickets/${ticket.id}`);
}
