import { prisma } from "./prisma";

export async function nextTicketNumber(organizationId: string) {
  const last = await prisma.ticket.aggregate({
    where: { organizationId },
    _max: { number: true },
  });
  return (last._max.number ?? 1000) + 1;
}

export async function openServiceTicket(input: {
  organizationId: string;
  farmerId: string;
  pivotId: string;
  technicianId: string | null;
  storeId?: string | null;
  userId: string;
  title: string;
  description: string;
  priority?: string;
  scheduledAt?: Date | null;
}) {
  const number = await nextTicketNumber(input.organizationId);
  const status = input.technicianId ? "ASSIGNED" : "OPEN";
  return prisma.ticket.create({
    data: {
      organizationId: input.organizationId,
      farmerId: input.farmerId,
      pivotId: input.pivotId,
      technicianId: input.technicianId,
      storeId: input.storeId ?? null,
      number,
      title: input.title,
      description: input.description,
      priority: input.priority ?? "NORMAL",
      status,
      scheduledAt: input.scheduledAt ?? null,
      updates: {
        create: {
          userId: input.userId,
          message: input.description,
          status,
        },
      },
    },
  });
}
