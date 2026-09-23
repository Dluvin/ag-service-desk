import { prisma } from "./prisma";

export const UNASSIGNED_FARM_LABEL = "Unassigned";

export type FarmOption = {
  id: string;
  name: string;
  farmerId: string;
};

export function parseFarmId(value: string) {
  return value.trim() || null;
}

export function currentAssignmentYear() {
  return new Date().getFullYear();
}

export async function resolveFarmIdForCustomer(
  organizationId: string,
  farmerId: string,
  farmId: string | null,
): Promise<{ farmId: string | null; error?: string }> {
  if (!farmId) return { farmId: null };
  const farm = await prisma.farm.findFirst({
    where: { id: farmId, organizationId, farmerId },
    select: { id: true },
  });
  if (!farm) return { farmId: null, error: "Farm not found for this customer." };
  return { farmId: farm.id };
}

export async function moveFarmToCustomer(input: {
  organizationId: string;
  farmId: string;
  toFarmerId: string;
}) {
  const year = currentAssignmentYear();
  const farm = await prisma.farm.findFirst({
    where: { id: input.farmId, organizationId: input.organizationId },
    select: { id: true, farmerId: true },
  });
  if (!farm) return { error: "Farm not found." };
  if (farm.farmerId === input.toFarmerId) return { farm };

  const customer = await prisma.farmer.findFirst({
    where: { id: input.toFarmerId, organizationId: input.organizationId },
    select: { id: true },
  });
  if (!customer) return { error: "Customer not found." };

  // Assets with this farmId travel with the farm. Unassigned pivots/assets (farmId null) stay on the old customer.
  await prisma.$transaction(async (tx) => {
    await tx.farm.update({
      where: { id: farm.id },
      data: { farmerId: customer.id },
    });
    await tx.$executeRaw`UPDATE Farm SET primaryContactId = NULL WHERE id = ${farm.id}`;
    await tx.pivot.updateMany({
      where: { farmId: farm.id, organizationId: input.organizationId },
      data: { farmerId: customer.id },
    });
    await tx.asset.updateMany({
      where: { farmId: farm.id, organizationId: input.organizationId },
      data: { farmerId: customer.id },
    });
    await tx.ticket.updateMany({
      where: {
        organizationId: input.organizationId,
        pivot: { farmId: farm.id },
      },
      data: { farmerId: customer.id },
    });
    await tx.farmAssignment.updateMany({
      where: { farmId: farm.id, endYear: null },
      data: { endYear: year },
    });
    await tx.farmAssignment.create({
      data: {
        farmId: farm.id,
        farmerId: customer.id,
        startYear: year,
      },
    });
  });

  return { farm };
}

export function farmAssignmentLabel(assignment: { startYear: number; endYear: number | null; farmerName: string }) {
  const span = assignment.endYear ? `${assignment.startYear}–${assignment.endYear}` : `${assignment.startYear}–present`;
  return `${span} ${assignment.farmerName}`;
}

export async function deleteFarmForCustomer(input: {
  organizationId: string;
  farmId: string;
}) {
  const farm = await prisma.farm.findFirst({
    where: { id: input.farmId, organizationId: input.organizationId },
    select: { id: true, farmerId: true },
  });
  if (!farm) return { error: "Farm not found." };

  // Schema already uses onDelete: SetNull for Pivot/Asset.farmId, but unassign
  // explicitly so assets stay with the same customer even if the FK is missing.
  await prisma.$transaction(async (tx) => {
    await tx.pivot.updateMany({
      where: { farmId: farm.id, organizationId: input.organizationId },
      data: { farmId: null },
    });
    await tx.asset.updateMany({
      where: { farmId: farm.id, organizationId: input.organizationId },
      data: { farmId: null },
    });
    await tx.farm.delete({ where: { id: farm.id } });
  });

  return { farm };
}

export async function createFarmForCustomer(input: {
  organizationId: string;
  farmerId: string;
  name: string;
  location?: string | null;
}) {
  return prisma.farm.create({
    data: {
      organizationId: input.organizationId,
      farmerId: input.farmerId,
      name: input.name,
      location: input.location || null,
      assignments: {
        create: {
          farmerId: input.farmerId,
          startYear: currentAssignmentYear(),
        },
      },
    },
  });
}

export async function assignCustomerAssetsToFarm(input: {
  organizationId: string;
  farmerId: string;
  farmId?: string | null;
  newFarm?: { name: string; location?: string | null } | null;
  pivotIds: string[];
  assetIds: string[];
}): Promise<{ farmId: string; error?: string }> {
  const pivotIds = [...new Set(input.pivotIds.filter(Boolean))];
  const assetIds = [...new Set(input.assetIds.filter(Boolean))];
  if (!pivotIds.length && !assetIds.length) {
    return { farmId: input.farmId ?? "", error: "Select at least one asset." };
  }

  const [pivots, assets] = await Promise.all([
    pivotIds.length
      ? prisma.pivot.findMany({
          where: { id: { in: pivotIds }, farmerId: input.farmerId, organizationId: input.organizationId },
          select: { id: true },
        })
      : Promise.resolve([]),
    assetIds.length
      ? prisma.asset.findMany({
          where: { id: { in: assetIds }, farmerId: input.farmerId, organizationId: input.organizationId },
          select: { id: true },
        })
      : Promise.resolve([]),
  ]);

  if (pivots.length !== pivotIds.length || assets.length !== assetIds.length) {
    return { farmId: input.farmId ?? "", error: "Some selected assets were not found for this customer." };
  }

  if (input.newFarm) {
    const name = input.newFarm.name.trim();
    if (!name) return { farmId: "", error: "Farm name is required." };
    const farm = await prisma.$transaction(async (tx) => {
      const created = await tx.farm.create({
        data: {
          organizationId: input.organizationId,
          farmerId: input.farmerId,
          name,
          location: input.newFarm?.location || null,
          assignments: {
            create: {
              farmerId: input.farmerId,
              startYear: currentAssignmentYear(),
            },
          },
        },
      });
      if (pivots.length) {
        await tx.pivot.updateMany({
          where: { id: { in: pivots.map((pivot) => pivot.id) }, organizationId: input.organizationId, farmerId: input.farmerId },
          data: { farmId: created.id },
        });
      }
      if (assets.length) {
        await tx.asset.updateMany({
          where: { id: { in: assets.map((asset) => asset.id) }, organizationId: input.organizationId, farmerId: input.farmerId },
          data: { farmId: created.id },
        });
      }
      return created;
    });
    return { farmId: farm.id };
  }

  const farm = await resolveFarmIdForCustomer(input.organizationId, input.farmerId, input.farmId ?? null);
  if (farm.error || !farm.farmId) {
    return { farmId: input.farmId ?? "", error: farm.error ?? "Select a farm or create a new one." };
  }

  await prisma.$transaction(async (tx) => {
    if (pivots.length) {
      await tx.pivot.updateMany({
        where: { id: { in: pivots.map((pivot) => pivot.id) }, organizationId: input.organizationId, farmerId: input.farmerId },
        data: { farmId: farm.farmId },
      });
    }
    if (assets.length) {
      await tx.asset.updateMany({
        where: { id: { in: assets.map((asset) => asset.id) }, organizationId: input.organizationId, farmerId: input.farmerId },
        data: { farmId: farm.farmId },
      });
    }
  });

  return { farmId: farm.farmId };
}
