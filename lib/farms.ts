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

  await prisma.$transaction(async (tx) => {
    await tx.farm.update({
      where: { id: farm.id },
      data: { farmerId: customer.id },
    });
    await tx.pivot.updateMany({
      where: { farmId: farm.id, organizationId: input.organizationId },
      data: { farmerId: customer.id },
    });
    await tx.asset.updateMany({
      where: { farmId: farm.id, organizationId: input.organizationId },
      data: { farmerId: customer.id },
    });
    const pivots = await tx.pivot.findMany({
      where: { farmId: farm.id, organizationId: input.organizationId },
      select: { id: true },
    });
    if (pivots.length) {
      await tx.ticket.updateMany({
        where: { pivotId: { in: pivots.map((pivot) => pivot.id) }, organizationId: input.organizationId },
        data: { farmerId: customer.id },
      });
    }
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
