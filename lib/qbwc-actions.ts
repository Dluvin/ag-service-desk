"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "./auth";
import { prisma } from "./prisma";
import { canAssignTickets, isAdmin, PRINTABLE_STATUSES } from "./roles";
import { ticketWhere } from "./scope";
import { orgQbwcIsOn } from "./ocr-samples";
import { ensureQbEstimateJobMeta, qbwcIsReady, setQbwcPassword } from "./qbwc";
import { clearQbJobMeta } from "./qbwc-xml";

export async function setQbwcPasswordAction(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Sign in to continue." };
  if (!isAdmin(session.role)) return { error: "Only company admins can set the Web Connector password." };
  if (!(await orgQbwcIsOn(session.organizationId))) {
    return { error: "QuickBooks Desktop is not on this plan. Ask platform to turn it on for this company." };
  }
  const password = String(formData.get("password") || "").trim();
  if (password.length < 8) return { error: "Use at least 8 characters." };
  await setQbwcPassword(session.organizationId, password);
  revalidatePath("/reveal");
  return { success: "Web Connector password saved. Download the .qwc file and add it in QuickBooks Web Connector." };
}

async function queueOrganizationEstimate(organizationId: string, ticketId: string) {
  await ensureQbEstimateJobMeta();
  const latest = await prisma.qbEstimateJob.findFirst({
    where: { ticketId },
    orderBy: { createdAt: "desc" },
  });
  if (latest && !(latest.status === "SENT" && latest.qbTxnId)) {
    await prisma.qbEstimateJob.deleteMany({
      where: {
        ticketId,
        id: { not: latest.id },
        qbTxnId: null,
        status: { in: ["QUEUED", "SENDING", "ERROR"] },
      },
    });
    await prisma.qbEstimateJob.update({
      where: { id: latest.id },
      data: { status: "QUEUED", error: null, qbTxnId: null, qbRefNumber: null },
    });
    await clearQbJobMeta(latest.id);
    return;
  }
  await prisma.qbEstimateJob.create({
    data: {
      organizationId,
      ticketId,
      status: "QUEUED",
    },
  });
}

export async function queueQbEstimateAction(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Sign in to continue." };
  if (!canAssignTickets(session.role)) return { error: "You cannot send estimates." };
  if (!(await orgQbwcIsOn(session.organizationId))) {
    return { error: "QuickBooks Desktop estimates are not on this plan." };
  }
  const ticketId = String(formData.get("ticketId") || "");
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, organizationId: session.organizationId },
    select: { id: true },
  });
  if (!ticket) return { error: "Work order not found." };
  if (!(await qbwcIsReady(session.organizationId))) {
    return { error: "Set a Web Connector password under Settings → Connectors first, then add the .qwc file in QuickBooks." };
  }
  await queueOrganizationEstimate(session.organizationId, ticket.id);
  revalidatePath(`/tickets/${ticket.id}`);
  return { success: "Queued. Run Update Selected in QuickBooks Web Connector to create the estimate." };
}

export async function queueQbEstimatesAction(ticketIds: string[]) {
  const session = await getSession();
  if (!session) return { error: "Sign in to continue." };
  if (!canAssignTickets(session.role)) return { error: "You cannot send estimates." };
  if (!(await orgQbwcIsOn(session.organizationId))) {
    return { error: "QuickBooks Desktop estimates are not on this plan." };
  }
  if (!(await qbwcIsReady(session.organizationId))) {
    return { error: "Set a Web Connector password under Settings → Connectors first, then add the .qwc file in QuickBooks." };
  }
  const ids = [...new Set(ticketIds.map((id) => id.trim()).filter(Boolean))].slice(0, 75);
  if (ids.length === 0) return { error: "Select at least one work order." };
  const tickets = await prisma.ticket.findMany({
    where: { id: { in: ids }, ...ticketWhere(session), status: { in: [...PRINTABLE_STATUSES] } },
    select: { id: true },
  });
  if (tickets.length === 0) return { error: "Those work orders cannot be sent." };
  for (const ticket of tickets) {
    await queueOrganizationEstimate(session.organizationId, ticket.id);
    revalidatePath(`/tickets/${ticket.id}`);
  }
  revalidatePath("/tickets/print");
  const count = tickets.length;
  return {
    success: `Queued ${count} estimate${count === 1 ? "" : "s"}. Run Update Selected once in QuickBooks Web Connector. Leave Auto-Run off.`,
  };
}
