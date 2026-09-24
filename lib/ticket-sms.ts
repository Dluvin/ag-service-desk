import { prisma } from "./prisma";
import { ROLES, type TicketStatus } from "./roles";
import { isPlaceholderUsNumber, sendBirdSms, toE164 } from "./bird";
import { appBaseUrl } from "./app-url";
import { ticketRepairDoneEmail } from "./email";
import { statusLabel, t, type Locale, type MessageKey } from "./i18n";
import { loadOrgLocales } from "./user-locale";

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

function addRecipient(recipients: Map<string, Locale>, raw: string | null | undefined, locale: Locale) {
  const e164 = toE164(raw);
  if (!e164 || isPlaceholderUsNumber(e164) || recipients.has(e164)) return;
  recipients.set(e164, locale);
}

function farmerPhones(farmer: { phone: string | null; contacts: { phone: string | null }[] }) {
  const recipients = new Map<string, Locale>();
  for (const contact of farmer.contacts) addRecipient(recipients, contact.phone, "en");
  if (farmer.contacts.length === 0) addRecipient(recipients, farmer.phone, "en");
  return [...recipients.keys()];
}

async function farmerLocale(farmerId: string, locales: Map<string, Locale>): Promise<Locale> {
  const users = await prisma.user.findMany({
    where: { farmerId, role: ROLES.FARMER },
    select: { id: true },
  });
  return locales.get(users[0]?.id ?? "") ?? "en";
}

async function shopStaffPhones(
  organizationId: string,
  storeId: string | null,
  roles: string[],
  locales: Map<string, Locale>,
  actorUserId?: string | null,
  fallbackToAll = true,
) {
  const recipients = new Map<string, Locale>();
  const select = { id: true, phone: true };
  const roleFilter = { in: roles };

  let people = storeId
    ? await prisma.user.findMany({
        where: { organizationId, role: roleFilter, storeId },
        select,
      })
    : [];
  if (people.length === 0 && (!storeId || fallbackToAll)) {
    people = await prisma.user.findMany({
      where: { organizationId, role: roleFilter },
      select,
    });
  }

  for (const person of people) {
    if (actorUserId && person.id === actorUserId) continue;
    addRecipient(recipients, person.phone, locales.get(person.id) ?? "en");
  }
  return recipients;
}

function staffSmsBody(
  locale: Locale,
  kind: "assigned" | "updated" | "opened",
  orgName: string,
  ticket: {
    id: string;
    number: number;
    title: string;
    status: string;
    farmer: { name: string };
    pivot: { name: string };
    technician: { name: string } | null;
  },
  note?: string,
) {
  const vars = {
    org: orgName,
    number: ticket.number,
    title: ticket.title,
    tech: ticket.technician?.name ?? t(locale, "sms.aTechnician"),
    customer: ticket.farmer.name,
    pivot: ticket.pivot.name,
    status: statusLabel(locale, ticket.status),
    note: clip(note || ""),
  };
  const key: MessageKey = kind === "assigned" ? "sms.assigned" : kind === "opened" ? "sms.opened" : "sms.updated";
  return withTicketLink(t(locale, key, vars), ticket.id);
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

  const locales = await loadOrgLocales(input.organizationId);
  const recipients = new Map<string, Locale>();
  if (input.kind === "assigned") {
    addRecipient(recipients, ticket.technician?.phone, locales.get(ticket.technician?.id ?? "") ?? "en");
  } else {
    const storeId = ticket.storeId ?? ticket.farmer.storeId;
    const managers = await shopStaffPhones(
      input.organizationId,
      storeId,
      [ROLES.MANAGER],
      locales,
      input.actorUserId,
    );
    for (const [phone, locale] of managers) recipients.set(phone, locale);
    if (input.kind === "updated" && ticket.status === "REPAIR_DONE") {
      const clerical = await shopStaffPhones(
        input.organizationId,
        storeId,
        [ROLES.CLERICAL],
        locales,
        input.actorUserId,
        false,
      );
      for (const [phone, locale] of clerical) recipients.set(phone, locale);
    }
  }

  if (recipients.size === 0) return;

  const config = {
    apiKey: org.birdApiKey,
    from: org.birdFrom || org.name.slice(0, 11),
    workspaceId: org.birdWorkspaceId || "",
    channelId: org.birdChannelId || "",
  };

  await Promise.allSettled(
    [...recipients.entries()].map(([to, locale]) =>
      sendBirdSms(config, to, staffSmsBody(locale, input.kind, org.name, ticket, input.note)).catch((error) => {
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

  const locales = await loadOrgLocales(input.organizationId);
  const locale = await farmerLocale(ticket.farmerId, locales);
  const body = withTicketLink(
    t(locale, "sms.farmerReady", {
      org: org.name,
      number: ticket.number,
      title: ticket.title,
    }),
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

  const locales = await loadOrgLocales(input.organizationId);
  const locale = await farmerLocale(ticket.farmerId, locales);

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
      locale,
    });
  }
}
