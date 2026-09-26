"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "./auth";
import { prisma } from "./prisma";
import { canAssignTickets, isAdmin } from "./roles";
import { orgQbwcIsOn } from "./ocr-samples";
import { qbwcIsReady, setQbwcPassword } from "./qbwc";

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
  const latest = await prisma.qbEstimateJob.findFirst({
    where: { ticketId: ticket.id },
    orderBy: { createdAt: "desc" },
  });
  if (latest && !(latest.status === "SENT" && latest.qbTxnId)) {
    await prisma.qbEstimateJob.deleteMany({
      where: {
        ticketId: ticket.id,
        id: { not: latest.id },
        qbTxnId: null,
        status: { in: ["QUEUED", "SENDING", "ERROR"] },
      },
    });
    await prisma.qbEstimateJob.update({
      where: { id: latest.id },
      data: { status: "QUEUED", error: null, qbTxnId: null, qbRefNumber: null },
    });
  } else {
    await prisma.qbEstimateJob.create({
      data: {
        organizationId: session.organizationId,
        ticketId: ticket.id,
        status: "QUEUED",
      },
    });
  }
  revalidatePath(`/tickets/${ticket.id}`);
  return { success: "Queued. Run Update Selected in QuickBooks Web Connector to create the estimate." };
}
