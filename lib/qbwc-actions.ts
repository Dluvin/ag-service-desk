"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "./auth";
import { prisma } from "./prisma";
import { canAssignTickets, isAdmin } from "./roles";
import { ensureQbwcConfig, qbwcIsReady, setQbwcPassword } from "./qbwc";

export async function setQbwcPasswordAction(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Sign in to continue." };
  if (!isAdmin(session.role)) return { error: "Only company admins can set the Web Connector password." };
  const password = String(formData.get("password") || "").trim();
  if (password.length < 8) return { error: "Use at least 8 characters." };
  await setQbwcPassword(session.organizationId, password);
  revalidatePath("/settings");
  return { success: "Web Connector password saved. Download the .qwc file and add it in QuickBooks Web Connector." };
}

export async function queueQbEstimateAction(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Sign in to continue." };
  if (!canAssignTickets(session.role)) return { error: "You cannot send estimates." };
  const ticketId = String(formData.get("ticketId") || "");
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, organizationId: session.organizationId },
    select: { id: true },
  });
  if (!ticket) return { error: "Work order not found." };
  if (!(await qbwcIsReady(session.organizationId))) {
    return { error: "Set a Web Connector password in Settings first, then add the .qwc file in QuickBooks." };
  }
  const already = await prisma.qbEstimateJob.findFirst({
    where: { ticketId: ticket.id, status: { in: ["QUEUED", "SENDING"] } },
    select: { id: true },
  });
  if (already) return { error: "This work order is already waiting for the next Web Connector run." };
  await prisma.qbEstimateJob.create({
    data: {
      organizationId: session.organizationId,
      ticketId: ticket.id,
      status: "QUEUED",
    },
  });
  revalidatePath(`/tickets/${ticket.id}`);
  return { success: "Queued. Run Update Selected in QuickBooks Web Connector to create the estimate." };
}
