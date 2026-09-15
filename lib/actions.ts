"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { createSession, destroySession, getSession, requireSession, verifyLogin } from "./auth";
import { PRIORITIES, ROLES, TICKET_STATUSES, isFinishedStatus, requiresInvoice, slugify, type TicketStatus } from "./roles";
import { openServiceTicket } from "./tickets";
import { INSPECTION_STATUS, STARTUP_CHECKS, STARTUP_SEASON_YEAR } from "./startup";
import { parseMapsLocation } from "./maps";
import { parseQuickbooksExport } from "./quickbooks";
import { parseAgSenseExport } from "./agsense";
import { closeOpenSiteVisits } from "./onsite";
import { REVEAL_EU, REVEAL_US, clearRevealTokenCache, listRevealVehicles } from "./reveal";
import { notifyTicketSms } from "./ticket-sms";
import { sendBirdSms, toE164 } from "./bird";

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function createFarmWithContact(
  organizationId: string,
  input: { name: string; address?: string; contactName?: string; phone?: string; email?: string },
) {
  const contactName = input.contactName || input.name;
  const phone = input.phone || null;
  const email = input.email || null;
  return prisma.farmer.create({
    data: {
      organizationId,
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
  if (session.role !== ROLES.ADMIN) return { error: "Only company admins can add farmers." };

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

export async function createTechnicianAction(formData: FormData) {
  const session = await requireSession();
  if (session.role !== ROLES.ADMIN) return { error: "Only company admins can add technicians." };

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

  let assigned: string | null = technicianId;
  if (session.role === ROLES.FARMER) assigned = null;
  if (session.role === ROLES.TECHNICIAN) assigned = session.userId;

  const ticket = await openServiceTicket({
    organizationId: session.organizationId,
    farmerId: pivot.farmerId,
    pivotId: pivot.id,
    technicianId: assigned,
    userId: session.userId,
    title,
    description,
    priority,
  });
  if (assigned) {
    await notifyTicketSms({
      organizationId: session.organizationId,
      ticketId: ticket.id,
      kind: "assigned",
      actorUserId: session.userId,
    });
  }
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

  if (session.role === ROLES.FARMER) {
    if (session.farmerId !== ticket.farmerId) return { error: "Not allowed." };
    if (!message) return { error: "Add a note for the service team." };
    await prisma.ticketUpdate.create({
      data: { ticketId, userId: session.userId, message },
    });
    await notifyTicketSms({
      organizationId: session.organizationId,
      ticketId,
      kind: "updated",
      actorUserId: session.userId,
      note: message,
    });
    redirect(`/tickets/${ticketId}`);
  }

  if (session.role === ROLES.TECHNICIAN && ticket.technicianId !== session.userId) {
    return { error: "This ticket is not assigned to you." };
  }

  if (!TICKET_STATUSES.includes(status)) return { error: "Invalid status." };

  const invoiceNumber = formString(formData, "invoiceNumber");
  if (requiresInvoice(status)) {
    if (!invoiceNumber) {
      return { error: "An invoice number is required before a ticket can be closed." };
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
    session.role === ROLES.ADMIN
      ? technicianId || null
      : ticket.technicianId;

  const previousTech = ticket.technicianId;
  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status,
      technicianId: nextTech,
      invoiceNumber: invoiceNumber || ticket.invoiceNumber,
      closedAt: requiresInvoice(status) ? (ticket.closedAt ?? new Date()) : ticket.closedAt,
    },
  });
  if (isFinishedStatus(status) || status === "REPAIR_DONE") {
    await closeOpenSiteVisits(ticketId);
  }

  const note = message || `Status set to ${status.replaceAll("_", " ").toLowerCase()}.`;
  await prisma.ticketUpdate.create({
    data: {
      ticketId,
      userId: session.userId,
      message: note,
      status,
    },
  });
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
    session.role === ROLES.ADMIN ? technicianId || null : ticket.technicianId;
  let nextStatus: string = TICKET_STATUSES.includes(status as TicketStatus) ? status : ticket.status;
  if (nextTech && nextStatus === "OPEN") nextStatus = "ASSIGNED";
  if (!nextTech && nextStatus === "ASSIGNED") nextStatus = "OPEN";
  if (requiresInvoice(nextStatus) && !ticket.invoiceNumber) {
    return { error: "Close this ticket from the ticket page and enter an invoice number." };
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

export async function importQuickbooksPartsAction(formData: FormData) {
  const session = await requireSession();
  if (session.role !== ROLES.ADMIN) return { error: "Only company admins can import parts." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a QuickBooks CSV or IIF file to import." };
  }
  if (file.size > 2_000_000) return { error: "File is too large. Keep the export under 2 MB." };

  const parts = parseQuickbooksExport(await file.text());
  if (parts.length === 0) {
    return {
      error:
        "No parts found. Export Products and Services from QuickBooks as CSV (or INVITEM IIF) with a Name column.",
    };
  }

  let created = 0;
  let updated = 0;
  for (const part of parts.slice(0, 5000)) {
    const existing = await prisma.catalogPart.findUnique({
      where: { organizationId_name: { organizationId: session.organizationId, name: part.name } },
    });
    await prisma.catalogPart.upsert({
      where: { organizationId_name: { organizationId: session.organizationId, name: part.name } },
      create: {
        organizationId: session.organizationId,
        name: part.name,
        sku: part.sku,
        description: part.description,
        itemType: part.itemType,
        price: part.price,
        cost: part.cost,
        quantityOnHand: part.quantityOnHand,
        source: "QUICKBOOKS",
      },
      update: {
        sku: part.sku ?? existing?.sku ?? null,
        description: part.description ?? existing?.description ?? null,
        itemType: part.itemType ?? existing?.itemType ?? null,
        price: part.price ?? existing?.price ?? null,
        cost: part.cost ?? existing?.cost ?? null,
        quantityOnHand: part.quantityOnHand ?? existing?.quantityOnHand ?? null,
        source: "QUICKBOOKS",
        active: true,
      },
    });
    if (existing) updated += 1;
    else created += 1;
  }

  redirect(`/parts?imported=${created}&updated=${updated}`);
}

export async function importAgSensePivotsAction(formData: FormData) {
  const session = await requireSession();
  if (session.role === ROLES.FARMER) return { error: "Farmers cannot import pivots." };

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

  const inspection = await prisma.startupInspection.create({
    data: {
      organizationId: session.organizationId,
      pivotId,
      seasonYear: STARTUP_SEASON_YEAR,
      status: INSPECTION_STATUS.IN_PROGRESS,
      inspectorId: session.userId,
      checks: {
        create: STARTUP_CHECKS.map((check) => ({
          checkKey: check.key,
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

  const results = STARTUP_CHECKS.map((check) => ({
    key: check.key,
    result: formString(formData, `result_${check.key}`) || "PENDING",
    notes: formString(formData, `notes_${check.key}`),
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
    const failLabels = failed
      .map((item) => STARTUP_CHECKS.find((check) => check.key === item.key)?.label ?? item.key)
      .join(", ");
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

export async function updateTechnicianVehicleAction(formData: FormData) {
  const session = await requireSession();
  if (session.role !== ROLES.ADMIN) return { error: "Only company admins can map Reveal vehicles." };

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
