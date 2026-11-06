import type { SessionUser } from "./auth";
import { prisma } from "./prisma";
import { ROLES } from "./roles";
import { farmerWhere, pivotWhere } from "./scope";

export type InspectionCustomerOption = {
  id: string;
  label: string;
  pivots: {
    id: string;
    name: string;
    serialNumber: string | null;
    packageItem: string | null;
    packageDescription: string | null;
    packageBrand: string | null;
    packageTowerCount: number | null;
  }[];
};

export async function listInspections(session: SessionUser, q = "") {
  const term = q.trim();
  return prisma.pivotInspection.findMany({
    where: {
      organizationId: session.organizationId,
      ...(session.role === ROLES.FARMER ? { farmerId: session.farmerId ?? "__none__" } : {}),
      ...(term
        ? {
            OR: [
              { customerName: { contains: term } },
              { inspectedBy: { contains: term } },
              { headerJson: { contains: term } },
            ],
          }
        : {}),
    },
    include: {
      ticket: { select: { id: true, number: true, status: true, scheduledAt: true } },
      pivot: { select: { id: true, name: true } },
    },
    orderBy: [{ inspectedOn: "desc" }, { updatedAt: "desc" }],
    take: 200,
  });
}

export async function getInspection(session: SessionUser, id: string) {
  return prisma.pivotInspection.findFirst({
    where: {
      id,
      organizationId: session.organizationId,
      ...(session.role === ROLES.FARMER ? { farmerId: session.farmerId ?? "__none__" } : {}),
    },
    include: {
      ticket: { select: { id: true, number: true, status: true, scheduledAt: true, priority: true } },
      pivot: { select: { id: true, name: true, serialNumber: true } },
      farmer: { select: { id: true, name: true } },
    },
  });
}

export async function loadInspectionCustomers(session: SessionUser): Promise<InspectionCustomerOption[]> {
  const farmers = await prisma.farmer.findMany({
    where: farmerWhere(session),
    include: {
      pivots: {
        where: pivotWhere(session),
        select: {
          id: true,
          name: true,
          serialNumber: true,
          packageItem: true,
          packageDescription: true,
          packageBrand: true,
          packageTowerCount: true,
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
  return farmers.map((farmer) => ({
    id: farmer.id,
    label: farmer.name,
    pivots: farmer.pivots,
  }));
}

export function scheduleFromInspectedOn(inspectedOn: string): Date {
  const [year, month, day] = inspectedOn.split("-").map(Number);
  return new Date(year, month - 1, day, 8, 0, 0, 0);
}
