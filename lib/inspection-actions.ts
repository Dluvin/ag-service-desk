"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "./auth";
import { requireInspectionsAccess } from "./inspection-access";
import {
  cleanLine,
  isIsoDate,
  parseTowerCount,
  resizeTowers,
  sanitizeCheckMap,
  visitAttention,
  type VisitDraft,
} from "./inspection-form";
import { getInspection, scheduleFromInspectedOn } from "./inspections";
import { orgQbCustomerListIsOn } from "./ocr-samples";
import {
  findPackagesBySerial,
  indexPivotPackages,
  packageFieldsFromMatch,
} from "./pivot-package-match";
import { loadPivotPackages } from "./pivot-packages-data";
import { linkQbCustomerToFarmer, resolveFarmerFromQbCustomer } from "./qb-customers";
import { prisma } from "./prisma";
import { ROLES } from "./roles";
import { farmerWhere, pivotWhere } from "./scope";
import { openServiceTicket } from "./tickets";

async function requireInspectionUser() {
  const session = await requireSession();
  await requireInspectionsAccess(session);
  return session;
}

function refreshInspections(id?: string, ticketId?: string | null, pivotId?: string | null) {
  revalidatePath("/inspections");
  revalidatePath("/inspections/print");
  revalidatePath("/dispatch");
  revalidatePath("/tickets");
  revalidatePath("/pivots");
  if (id) revalidatePath(`/inspections/${id}`);
  if (ticketId) revalidatePath(`/tickets/${ticketId}`);
  if (pivotId) revalidatePath(`/pivots/${pivotId}`);
}

export async function saveVisitAction(
  input: VisitDraft & { id?: string },
): Promise<{ id: string } | { error: string }> {
  const session = await requireInspectionUser();
  const id = cleanLine(input.id ?? "", 40);
  const existing = id ? await getInspection(session, id) : null;
  if (id && (!existing || existing.kind !== "visit")) {
    return { error: "That inspection is no longer on file." };
  }
  if (!isIsoDate(cleanLine(input.inspectedOn, 10))) return { error: "Enter the date inspected." };
  const inspectedBy = cleanLine(input.inspectedBy, 80);
  if (!inspectedBy) return { error: "Enter who did the inspection." };

  const qbListId = cleanLine(input.qbListId, 80);
  const farmerId = cleanLine(input.farmerId, 40);
  const useQbCustomers = await orgQbCustomerListIsOn(session.organizationId);
  const deskPivotId = cleanLine(input.deskPivotId, 40);

  // Assets keep their Ag Desk customer. A selected pivot/asset owns the farmer.
  const pivot = deskPivotId
    ? await prisma.pivot.findFirst({
        where: { ...pivotWhere(session), id: deskPivotId },
      })
    : null;
  if (deskPivotId && !pivot) return { error: "That pivot is not on file." };

  let farmer =
    pivot
      ? await prisma.farmer.findFirst({
          where: { ...farmerWhere(session), id: pivot.farmerId },
        })
      : null;
  if (!farmer && farmerId) {
    farmer = await prisma.farmer.findFirst({
      where: { ...farmerWhere(session), id: farmerId },
    });
  }
  if (!farmer && useQbCustomers && qbListId) {
    const resolved = await resolveFarmerFromQbCustomer(session.organizationId, qbListId, {
      createIfMissing: !deskPivotId,
    });
    farmer = resolved
      ? await prisma.farmer.findFirst({
          where: { ...farmerWhere(session), id: resolved.id },
        })
      : null;
  }
  if (!farmer) {
    return {
      error: useQbCustomers
        ? "Choose a QuickBooks customer that already matches an Ag Desk customer, or pick one of that customer's pivots."
        : "Choose a customer.",
    };
  }

  if (useQbCustomers && qbListId) {
    await linkQbCustomerToFarmer(session.organizationId, qbListId, farmer.id);
  }

  const towerCount = parseTowerCount(String(input.towerCount ?? ""));
  if (!towerCount) return { error: "Enter the number of towers, from 1 to 20." };
  const brand = cleanLine(input.brand, 40);
  if (!brand) return { error: "Enter the brand." };

  const towers = resizeTowers(
    (input.towers ?? []).map((tower) => ({
      tireSize: cleanLine(tower?.tireSize ?? "", 80),
      gearMotorRpm: cleanLine(tower?.gearMotorRpm ?? "", 80),
      checks: sanitizeCheckMap(tower?.checks, "tower"),
    })),
    towerCount,
  );
  const pointChecks = sanitizeCheckMap(input.pointChecks, "point");
  const serialNumber = cleanLine(input.serialNumber, 80);
  const header = {
    serialNumber,
    brand,
    towerCount: String(towerCount),
    packageItem: cleanLine(input.packageItem, 40),
    packageDescription: cleanLine(input.packageDescription, 300),
    pivotId: cleanLine(input.pivotId, 80) || pivot?.name || "",
    modelNumber: cleanLine(input.modelNumber, 80),
    fuseSize: cleanLine(input.fuseSize, 80),
    hours: cleanLine(input.hours, 80),
    qbListId,
  };
  const inspectedOn = cleanLine(input.inspectedOn, 10);
  const checksJson = JSON.stringify({ point: pointChecks, towers });
  const problems = visitAttention({ pointChecks, towers });
  const pivotLabel = pivot?.name || header.pivotId || serialNumber || "pivot";
  const title = `Pivot inspection · ${brand} · ${pivotLabel}`;
  const descriptionLines = [
    `Pivot inspection for ${farmer.name}.`,
    brand ? `Brand: ${brand}` : "",
    serialNumber ? `Serial: ${serialNumber}` : "",
    `Towers: ${towerCount}`,
    `Inspected ${inspectedOn} by ${inspectedBy}.`,
    problems ? `${problems} item(s) need follow-up.` : "No follow-up items marked.",
  ].filter(Boolean);
  const description = descriptionLines.join("\n");
  const scheduledAt = scheduleFromInspectedOn(inspectedOn);
  const priority = problems > 0 ? "HIGH" : "NORMAL";

  const data = {
    kind: "visit",
    farmerId: farmer.id,
    pivotId: pivot?.id ?? null,
    customerName: farmer.name,
    inspectedOn,
    inspectedBy,
    headerJson: JSON.stringify(header),
    checksJson,
  };

  let saved = existing
    ? await prisma.pivotInspection.update({
        where: { id: existing.id },
        data,
      })
    : await prisma.pivotInspection.create({
        data: {
          ...data,
          organizationId: session.organizationId,
          createdById: session.userId,
          createdByName: session.name,
        },
      });

  if (pivot) {
    const packageItem = cleanLine(input.packageItem, 40);
    const pivotPatch: {
      serialNumber?: string;
      packageItem?: string;
      packageDescription?: string;
      packageBrand?: string | null;
      packageTowerCount?: number | null;
      packageLengthFeet?: string | null;
      packageVendor?: string | null;
      packageMatchedAt?: Date;
    } = {};

    if (serialNumber && !pivot.serialNumber) {
      pivotPatch.serialNumber = serialNumber;
    }

    // Serial/package match from the inspection attaches onto the selected pivot/asset.
    if (packageItem || serialNumber) {
      const packages = await loadPivotPackages();
      const index = indexPivotPackages(packages);
      const byItem = packageItem
        ? packages.find((pkg) => pkg.item.toLowerCase() === packageItem.toLowerCase())
        : null;
      const bySerial = !byItem && serialNumber ? findPackagesBySerial(index, serialNumber) : [];
      const matched = byItem ?? (bySerial.length === 1 ? bySerial[0] : null);
      if (matched) {
        Object.assign(pivotPatch, packageFieldsFromMatch(matched));
      } else if (packageItem) {
        Object.assign(pivotPatch, {
          packageItem,
          packageDescription: cleanLine(input.packageDescription, 300) || null,
          packageBrand: brand || null,
          packageTowerCount: towerCount,
          packageMatchedAt: new Date(),
        });
      }
    }

    if (Object.keys(pivotPatch).length) {
      await prisma.pivot.update({
        where: { id: pivot.id },
        data: pivotPatch,
      });
    }
  }

  let ticketId = existing?.ticketId ?? saved.ticketId;
  if (!ticketId) {
    const ticket = await openServiceTicket({
      organizationId: session.organizationId,
      farmerId: farmer.id,
      pivotId: pivot?.id ?? null,
      technicianId: session.role === ROLES.TECHNICIAN ? session.userId : null,
      storeId: null,
      userId: session.userId,
      title,
      description,
      priority,
      scheduledAt,
    });
    ticketId = ticket.id;
    saved = await prisma.pivotInspection.update({
      where: { id: saved.id },
      data: { ticketId },
    });
  } else {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        title,
        description,
        priority,
        scheduledAt,
        pivotId: pivot?.id ?? undefined,
        farmerId: farmer.id,
      },
    });
    await prisma.ticketUpdate.create({
      data: {
        ticketId,
        userId: session.userId,
        message: problems
          ? `Inspection updated · ${problems} item(s) need follow-up.`
          : "Inspection updated · no follow-up items marked.",
      },
    });
  }

  refreshInspections(saved.id, ticketId, pivot?.id);
  return { id: saved.id };
}

export async function deleteInspectionAction(formData: FormData) {
  const session = await requireInspectionUser();
  const id = cleanLine(String(formData.get("id") ?? ""), 40);
  if (id) {
    const item = await getInspection(session, id);
    if (item) {
      await prisma.pivotInspection.delete({ where: { id: item.id } });
      refreshInspections(item.id, item.ticketId);
    }
  }
  redirect("/inspections");
}
