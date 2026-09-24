import { prisma } from "./prisma";
import { ROLES, STATUS_LABELS, type TicketStatus } from "./roles";
import { isPlaceholderUsNumber, sendBirdSms, toE164 } from "./bird";
import { appBaseUrl } from "./app-url";
import { ticketRepairDoneEmail } from "./email";

function clip(text: string, max = 140) {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length <= max ? compact : `${compact.slice(0, max - 1)}…`;
}

function ticketLink(ticketId: string) {
  const base = appBaseUrl();
  return base ? `${base}/tickets/${ticketId}` : "";
}

function withTicketLink(body: string, ticketId: string) {
  const url = ticketLink(ticketId);
  return url ? `${body} ${url}` : body;
}

/** Customer texts only when a work order moves to Repair done. */
export const TICKET_SMS_STATUSES: TicketStatus[] = ["REPAIR_DONE"];

function addRecipient(recipients: Map<string, string>, raw: string | null | undefined) {
  const e164 = toE164(raw);
  if (!e164 || isPlaceholderUsNumber(e164) || recipients.has(e164)) return;
  recipients.set(e164, e164);
}

function farmerPhones(farmer: { phone: string | null; contacts: { phone: string | null }[] }) {
  const recipients = new Map<string, string>();
  for (const contact of farmer.contacts) addRecipient(recipients, contact.phone);
  if (farmer.contacts.length === 0) addRecipient(recipients, farmer.phone);
  return [...recipients.keys()];
}

async function managerPhones(
  organizationId: string,
  storeId: string | null,
  actorUserId?: string | null,
) {
  const recipients = new Map<string, string>();
  const select = { id: true, phone: true };

  let managers = storeId
    ? await prisma.user.findMany({
        where: { organizationId, role: ROLES.MANAGER, storeId },
        select,
      })
    : [];
  if (managers.length === 0) {
    managers = await prisma.user.findMany({
      where: { organizationId, role: ROLES.MANAGER },
      select,
    });
  }

  for (const manager of managers) {
    if (actorUserId && manager.id === actorUserId) continue;
    addRecipient(recipients, manager.phone);
  }
  return recipients;
}

export async function notifyTicketSms(input: {
  organizationId: string;
  ticketId: string;
  kind: "assigned" | "updated" | "opened";
  actorUserId?: string | null;
  note?: string;
}) {
  const org = await prisma.organization.findUnique({ where: { id: input.organizationId } });
  if (!org?.birdSmsEnabled || !org.birdApiKey) return;

  const ticket = await prisma.ticket.findFirst({
    where: { id: input.ticketId, organizationId: input.organizationId },
    include: {
      farmer: { select: { name: true, storeId: true } },
      pivot: true,
      technician: true,
    },
  });
  if (!ticket) return;

  const statusLabel = STATUS_LABELS[ticket.status as TicketStatus] ?? ticket.status;
  const body = withTicketLink(
    input.kind === "assigned"
      ? `${org.name}: Work order #${ticket.number} ${ticket.title} assigned to ${ticket.technician?.name ?? "a technician"}. Customer: ${ticket.farmer.name}. Pivot: ${ticket.pivot.name}.`
      : input.kind === "opened"
        ? `${org.name}: New work order #${ticket.number} ${ticket.title} from ${ticket.farmer.name} (${ticket.pivot.name}). ${clip(input.note || "")}`
        : `${org.name}: Work order #${ticket.number} ${ticket.title} updated (${statusLabel}). ${clip(input.note || "")} Customer: ${ticket.farmer.name}.`,
    ticket.id,
  );

  const recipients = new Map<string, string>();
  if (input.kind === "assigned") {
    addRecipient(recipients, ticket.technician?.phone);
  } else {
    const storeId = ticket.storeId ?? ticket.farmer.storeId;
    const managers = await managerPhones(input.organizationId, storeId, input.actorUserId);
    for (const [phone, value] of managers) recipients.set(phone, value);
  }

  if (recipients.size === 0) return;

  const config = {
    apiKey: org.birdApiKey,
    from: org.birdFrom || org.name.slice(0, 11),
    workspaceId: org.birdWorkspaceId || "",
    channelId: org.birdChannelId || "",
  };

  await Promise.allSettled(
    [...recipients.keys()].map((to) =>
      sendBirdSms(config, to, body).catch((error) => {
        console.error(`Bird SMS to ${to} failed`, error);
      }),
    ),
  );
}

export async function sendTicketStatusSmsToFarmer(input: {
  organizationId: string;
  ticketId: string;
  status: TicketStatus;
}) {
  if (!TICKET_SMS_STATUSES.includes(input.status)) return;

  const org = await prisma.organization.findUnique({ where: { id: input.organizationId } });
  if (!org?.birdSmsEnabled || !org.birdApiKey) return;

  const ticket = await prisma.ticket.findFirst({
    where: { id: input.ticketId, organizationId: input.organizationId },
    include: {
      farmer: { include: { contacts: true } },
      pivot: true,
    },
  });
  if (!ticket) return;

  const body = withTicketLink(
    `${org.name}: Work order #${ticket.number} ${ticket.title} is repaired and ready.`,
    ticket.id,
  );
  const phones = farmerPhones(ticket.farmer);
  if (phones.length === 0) return;

  const config = {
    apiKey: org.birdApiKey,
    from: org.birdFrom || org.name.slice(0, 11),
    workspaceId: org.birdWorkspaceId || "",
    channelId: org.birdChannelId || "",
  };

  await Promise.allSettled(
    phones.map((to) =>
      sendBirdSms(config, to, body).catch((error) => {
        console.error(`Bird SMS to ${to} failed`, error);
      }),
    ),
  );
}

export async function notifyFarmerRepairDone(input: {
  organizationId: string;
  ticketId: string;
}) {
  const ticket = await prisma.ticket.findFirst({
    where: { id: input.ticketId, organizationId: input.organizationId },
    include: {
      farmer: true,
      pivot: true,
      organization: { select: { name: true } },
    },
  });
  if (!ticket || ticket.status !== "REPAIR_DONE") return;

  await sendTicketStatusSmsToFarmer({
    organizationId: input.organizationId,
    ticketId: input.ticketId,
    status: "REPAIR_DONE",
  });

  if (ticket.farmer.email) {
    await ticketRepairDoneEmail({
      to: ticket.farmer.email,
      organizationName: ticket.organization.name,
      farmerName: ticket.farmer.name,
      ticketNumber: ticket.number,
      title: ticket.title,
      pivotName: ticket.pivot.name,
      ticketId: ticket.id,
    });
  }
}
