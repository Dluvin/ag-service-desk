import { prisma } from "./prisma";
import { STATUS_LABELS, type TicketStatus } from "./roles";
import { isPlaceholderUsNumber, sendBirdSms, toE164 } from "./bird";

function clip(text: string, max = 140) {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length <= max ? compact : `${compact.slice(0, max - 1)}…`;
}

export async function notifyTicketSms(input: {
  organizationId: string;
  ticketId: string;
  kind: "assigned" | "updated";
  actorUserId?: string | null;
  note?: string;
}) {
  const org = await prisma.organization.findUnique({ where: { id: input.organizationId } });
  if (!org?.birdSmsEnabled || !org.birdApiKey) return;

  const ticket = await prisma.ticket.findFirst({
    where: { id: input.ticketId, organizationId: input.organizationId },
    include: {
      farmer: { include: { contacts: true } },
      pivot: true,
      technician: true,
    },
  });
  if (!ticket) return;

  const statusLabel = STATUS_LABELS[ticket.status as TicketStatus] ?? ticket.status;
  const assignedLine =
    input.kind === "assigned"
      ? `${org.name}: Ticket #${ticket.number} ${ticket.title} assigned to ${ticket.technician?.name ?? "a technician"}. Farm: ${ticket.farmer.name}. Pivot: ${ticket.pivot.name}.`
      : `${org.name}: Ticket #${ticket.number} ${ticket.title} updated (${statusLabel}). ${clip(input.note || "")} Farm: ${ticket.farmer.name}.`;

  const recipients = new Map<string, string>();
  const addPhone = (raw: string | null | undefined) => {
    const e164 = toE164(raw);
    if (!e164 || isPlaceholderUsNumber(e164) || recipients.has(e164)) return;
    recipients.set(e164, e164);
  };

  for (const contact of ticket.farmer.contacts) addPhone(contact.phone);
  addPhone(ticket.farmer.phone);

  const skipTech = Boolean(input.actorUserId && ticket.technicianId === input.actorUserId);
  if (ticket.technician?.phone && !skipTech) addPhone(ticket.technician.phone);

  const config = {
    apiKey: org.birdApiKey,
    from: org.birdFrom || org.name.slice(0, 11),
    workspaceId: org.birdWorkspaceId || "",
    channelId: org.birdChannelId || "",
  };

  await Promise.allSettled(
    [...recipients.keys()].map((to) =>
      sendBirdSms(config, to, assignedLine).catch((error) => {
        console.error(`Bird SMS to ${to} failed`, error);
      }),
    ),
  );
}
