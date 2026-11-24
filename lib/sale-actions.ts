"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "./auth";
import { prisma } from "./prisma";
import { ROLES, canDeleteRecords, isShopStaff } from "./roles";
import { parseMapsLocation } from "./maps";
import { ensureAssetTypes, isPivotAssetType } from "./assets";
import { createFarmForCustomer, parseFarmId, resolveFarmIdForCustomer } from "./farms";
import { isSaleFinished, isSaleStatus, parseSaleDateInput } from "./sales";

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function resolveStoreId(organizationId: string, storeId: string) {
  if (!storeId) return null;
  const store = await prisma.store.findFirst({ where: { id: storeId, organizationId } });
  return store?.id ?? null;
}

async function resolveSalesmanUserId(organizationId: string, userId: string) {
  if (!userId) return null;
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      organizationId,
      role: { in: [ROLES.MANAGER, ROLES.SALESPERSON] },
    },
    select: { id: true, name: true },
  });
  return user;
}

async function createCustomer(
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

async function resolveSaleCustomer(organizationId: string, formData: FormData, storeId: string | null) {
  let farmerId = formString(formData, "farmerId");
  if (formString(formData, "farmerMode") === "new") {
    const farmerName = formString(formData, "farmerName");
    if (!farmerName) return { error: "Customer name is required." as const };
    const farmer = await createCustomer(organizationId, {
      name: farmerName,
      address: formString(formData, "farmerAddress"),
      contactName: formString(formData, "contactName") || formString(formData, "farmerContactName"),
      phone: formString(formData, "contactPhone") || formString(formData, "farmerPhone"),
      email: formString(formData, "farmerEmail").toLowerCase(),
      storeId,
    });
    farmerId = farmer.id;
  }
  if (!farmerId) return { farmerId: null as string | null, farmId: null as string | null };

  const farmer = await prisma.farmer.findFirst({
    where: { id: farmerId, organizationId },
    select: { id: true },
  });
  if (!farmer) return { error: "Customer not found." as const };

  let farmId: string | null = null;
  if (formString(formData, "farmMode") === "new") {
    const farmName = formString(formData, "farmName");
    if (!farmName) return { error: "Farm name is required." as const };
    const farm = await createFarmForCustomer({
      organizationId,
      farmerId,
      name: farmName,
      location: formString(formData, "farmLocation") || formString(formData, "location") || null,
    });
    farmId = farm.id;
  } else {
    const farm = await resolveFarmIdForCustomer(
      organizationId,
      farmerId,
      parseFarmId(formString(formData, "farmId")),
    );
    if (farm.error) return { error: farm.error };
    farmId = farm.farmId;
  }

  return { farmerId, farmId };
}

function parseOptionalGps(formData: FormData) {
  const mapsInput = formString(formData, "mapsInput");
  const parsed = mapsInput ? parseMapsLocation(mapsInput) : null;
  const latRaw = formString(formData, "latitude");
  const lngRaw = formString(formData, "longitude");
  const latitude = parsed?.latitude ?? (latRaw ? Number(latRaw) : NaN);
  const longitude = parsed?.longitude ?? (lngRaw ? Number(lngRaw) : NaN);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { latitude: null as number | null, longitude: null as number | null };
  }
  return { latitude, longitude };
}

function saleFieldsFromForm(formData: FormData) {
  const jobLead = formString(formData, "jobLead");
  const status = formString(formData, "status") || "LEAD";
  if (!jobLead) return { error: "Job lead is required." as const };
  if (!isSaleStatus(status)) return { error: "Invalid status." as const };
  if (isSaleFinished(status)) {
    return { error: "Use Finish sale to complete a deal and create the asset." as const };
  }
  const gps = parseOptionalGps(formData);
  return {
    jobLead,
    status,
    salesmanName: formString(formData, "salesmanName") || null,
    location: formString(formData, "location") || null,
    contactPhone: formString(formData, "contactPhone") || null,
    contactName: formString(formData, "contactName") || null,
    notes: formString(formData, "notes") || null,
    lastContactAt: parseSaleDateInput(formString(formData, "lastContactAt")),
    assetTypeSlug: formString(formData, "assetTypeSlug") || null,
    assetName: formString(formData, "assetName") || null,
    serialNumber: formString(formData, "serialNumber") || null,
    locationNote: formString(formData, "locationNote") || null,
    latitude: gps.latitude,
    longitude: gps.longitude,
  };
}

export async function createSaleAction(formData: FormData) {
  const session = await requireSession();
  if (!isShopStaff(session.role)) return { error: "Only shop staff can manage sales." };

  const fields = saleFieldsFromForm(formData);
  if ("error" in fields) return fields;

  const storeId = await resolveStoreId(session.organizationId, formString(formData, "storeId"));
  const salesman = await resolveSalesmanUserId(session.organizationId, formString(formData, "salesmanUserId"));
  const customer = await resolveSaleCustomer(session.organizationId, formData, storeId);
  if ("error" in customer) return customer;

  const sale = await prisma.sale.create({
    data: {
      organizationId: session.organizationId,
      storeId,
      farmerId: customer.farmerId,
      farmId: customer.farmId,
      salesmanUserId: salesman?.id ?? null,
      salesmanName: fields.salesmanName || salesman?.name || null,
      jobLead: fields.jobLead,
      location: fields.location,
      contactPhone: fields.contactPhone,
      contactName: fields.contactName,
      notes: fields.notes,
      status: fields.status,
      lastContactAt: fields.lastContactAt,
      assetTypeSlug: fields.assetTypeSlug,
      assetName: fields.assetName,
      serialNumber: fields.serialNumber,
      locationNote: fields.locationNote,
      latitude: fields.latitude,
      longitude: fields.longitude,
    },
  });

  revalidatePath("/sales");
  redirect(`/sales/${sale.id}`);
}

export async function updateSaleAction(formData: FormData) {
  const session = await requireSession();
  if (!isShopStaff(session.role)) return { error: "Only shop staff can manage sales." };

  const saleId = formString(formData, "saleId");
  const existing = await prisma.sale.findFirst({
    where: { id: saleId, organizationId: session.organizationId },
  });
  if (!existing) return { error: "Sale not found." };
  if (isSaleFinished(existing.status) || existing.pivotId || existing.assetId) {
    return { error: "This sale is finished. Open the linked asset to make changes." };
  }

  const fields = saleFieldsFromForm(formData);
  if ("error" in fields) return fields;

  const storeId = await resolveStoreId(session.organizationId, formString(formData, "storeId"));
  const salesman = await resolveSalesmanUserId(session.organizationId, formString(formData, "salesmanUserId"));
  const customer = await resolveSaleCustomer(session.organizationId, formData, storeId);
  if ("error" in customer) return customer;

  await prisma.sale.update({
    where: { id: existing.id },
    data: {
      storeId,
      farmerId: customer.farmerId,
      farmId: customer.farmId,
      salesmanUserId: salesman?.id ?? null,
      salesmanName: fields.salesmanName || salesman?.name || null,
      jobLead: fields.jobLead,
      location: fields.location,
      contactPhone: fields.contactPhone,
      contactName: fields.contactName,
      notes: fields.notes,
      status: fields.status,
      lastContactAt: fields.lastContactAt,
      assetTypeSlug: fields.assetTypeSlug,
      assetName: fields.assetName,
      serialNumber: fields.serialNumber,
      locationNote: fields.locationNote,
      latitude: fields.latitude,
      longitude: fields.longitude,
    },
  });

  revalidatePath("/sales");
  revalidatePath(`/sales/${existing.id}`);
  redirect(`/sales/${existing.id}`);
}

export async function finishSaleAction(formData: FormData) {
  const session = await requireSession();
  if (!isShopStaff(session.role)) return { error: "Only shop staff can finish sales." };

  const saleId = formString(formData, "saleId");
  const sale = await prisma.sale.findFirst({
    where: { id: saleId, organizationId: session.organizationId },
    include: { farmer: true },
  });
  if (!sale) return { error: "Sale not found." };
  if (isSaleFinished(sale.status) || sale.pivotId || sale.assetId) {
    return { error: "This sale is already finished." };
  }

  const storeId = sale.storeId ?? (await resolveStoreId(session.organizationId, formString(formData, "storeId")));
  let farmerId = sale.farmerId;
  if (!farmerId) {
    const customer = await resolveSaleCustomer(session.organizationId, formData, storeId);
    if ("error" in customer) return customer;
    if (!customer.farmerId) return { error: "Select or create a customer before finishing." };
    farmerId = customer.farmerId;
    if (customer.farmId) {
      await prisma.sale.update({ where: { id: sale.id }, data: { farmerId, farmId: customer.farmId } });
    } else {
      await prisma.sale.update({ where: { id: sale.id }, data: { farmerId } });
    }
  }

  const farmer = await prisma.farmer.findFirst({
    where: { id: farmerId, organizationId: session.organizationId },
  });
  if (!farmer) return { error: "Customer not found." };

  let farmId = sale.farmId;
  if (formString(formData, "farmMode") === "new") {
    const farmName = formString(formData, "farmName");
    if (!farmName) return { error: "Farm name is required." };
    const farm = await createFarmForCustomer({
      organizationId: session.organizationId,
      farmerId,
      name: farmName,
      location: formString(formData, "farmLocation") || sale.location,
    });
    farmId = farm.id;
  } else if (formData.has("farmId")) {
    const farm = await resolveFarmIdForCustomer(
      session.organizationId,
      farmerId,
      parseFarmId(formString(formData, "farmId")),
    );
    if (farm.error) return { error: farm.error };
    farmId = farm.farmId;
  }

  const types = await ensureAssetTypes(session.organizationId);
  const typeSlug = formString(formData, "assetTypeSlug") || sale.assetTypeSlug || "pivots";
  const type = types.find((item) => item.slug === typeSlug) ?? types.find(isPivotAssetType) ?? types[0];
  if (!type) return { error: "Choose an asset type." };

  const assetName =
    formString(formData, "assetName") || sale.assetName || sale.jobLead;
  if (!assetName) return { error: "Asset name is required." };

  const mapsInput = formString(formData, "mapsInput");
  const latitude = Number(formString(formData, "latitude"));
  const longitude = Number(formString(formData, "longitude"));
  const parsed = mapsInput ? parseMapsLocation(mapsInput) : null;
  const lat = parsed?.latitude ?? (Number.isFinite(latitude) ? latitude : sale.latitude);
  const lng = parsed?.longitude ?? (Number.isFinite(longitude) ? longitude : sale.longitude);
  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
    return { error: "A map location is required to create the asset." };
  }

  const serialNumber = formString(formData, "serialNumber") || sale.serialNumber || null;
  const locationNote =
    formString(formData, "locationNote") || sale.locationNote || sale.location || null;
  const now = new Date();

  if (isPivotAssetType(type)) {
    const pivot = await prisma.pivot.create({
      data: {
        organizationId: session.organizationId,
        farmerId,
        farmId,
        name: assetName,
        latitude: lat,
        longitude: lng,
        serialNumber,
        locationNote,
      },
    });
    await prisma.sale.update({
      where: { id: sale.id },
      data: {
        farmerId,
        farmId,
        assetTypeSlug: type.slug,
        assetName,
        serialNumber,
        latitude: lat,
        longitude: lng,
        locationNote,
        pivotId: pivot.id,
        assetId: null,
        status: "COMPLETED",
        finishedAt: now,
        lastContactAt: sale.lastContactAt ?? now,
      },
    });
    revalidatePath("/sales");
    revalidatePath("/assets");
    revalidatePath("/pivots");
    redirect(`/pivots/${pivot.id}`);
  }

  const asset = await prisma.asset.create({
    data: {
      organizationId: session.organizationId,
      assetTypeId: type.id,
      farmerId,
      farmId,
      name: assetName,
      latitude: lat,
      longitude: lng,
      serialNumber,
      locationNote,
      notes: sale.notes,
    },
  });
  await prisma.sale.update({
    where: { id: sale.id },
    data: {
      farmerId,
      farmId,
      assetTypeSlug: type.slug,
      assetName,
      serialNumber,
      latitude: lat,
      longitude: lng,
      locationNote,
      assetId: asset.id,
      pivotId: null,
      status: "COMPLETED",
      finishedAt: now,
      lastContactAt: sale.lastContactAt ?? now,
    },
  });
  revalidatePath("/sales");
  revalidatePath("/assets");
  redirect(`/assets/${asset.id}`);
}

export async function deleteSaleAction(formData: FormData) {
  const session = await requireSession();
  if (!canDeleteRecords(session.role)) return { error: "Only company admins can delete sales." };

  const saleId = formString(formData, "saleId");
  const sale = await prisma.sale.findFirst({
    where: { id: saleId, organizationId: session.organizationId },
    select: { id: true },
  });
  if (!sale) return { error: "Sale not found." };

  await prisma.sale.delete({ where: { id: sale.id } });
  revalidatePath("/sales");
  redirect("/sales");
}
