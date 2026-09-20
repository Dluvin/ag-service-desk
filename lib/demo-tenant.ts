import { prisma } from "./prisma";
import { openServiceTicket } from "./tickets";

export async function seedApprovedDemo(organizationId: string, adminUserId: string) {
  const existing = await prisma.farmer.count({ where: { organizationId } });
  if (existing > 0) return;

  const store = await prisma.store.create({
    data: {
      organizationId,
      name: "Main shop (demo)",
      address: "Replace with your shop address",
    },
  });
  const farm = await prisma.farmer.create({
    data: {
      organizationId,
      storeId: store.id,
      name: "Demo farm",
      address: "Sample pivot location — delete when you add real farms",
      contacts: { create: { name: "Demo contact", phone: "555-0100" } },
    },
  });
  const pivot = await prisma.pivot.create({
    data: {
      organizationId,
      farmerId: farm.id,
      name: "Demo pivot 1",
      latitude: 32.3668,
      longitude: -86.3,
      locationNote: "Sample map pin for the 15-day trial",
    },
  });
  await openServiceTicket({
    organizationId,
    farmerId: farm.id,
    pivotId: pivot.id,
    technicianId: null,
    storeId: store.id,
    userId: adminUserId,
    title: "Demo service call",
    description:
      "This is sample work so you can click through tickets, dispatch, and maps during your trial. Delete it when you add a real farm.",
    priority: "NORMAL",
  });
}
