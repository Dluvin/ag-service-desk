import { prisma } from "./prisma";
import { ROLES, SHOP_STAFF_ROLES, TICKET_STATUSES, type TicketStatus } from "./roles";
import { isPlaceholderUsNumber, sendBirdSms, toE164 } from "./bird";
import { appBaseUrl } from "./app-url";
import { ticketRepairDoneEmail, officeRepairDoneEmail } from "./email";
import { sendEmail } from "./mail";
import { sendsEmail, sendsSms } from "./notify-channel";
import { anyStaffWants, customerWants, roleWants } from "./notify-status";
import { parseNotifyRecipients } from "./notify-recipients";
import { closedTicketPrintInclude } from "./ticket-print";
import { workOrderAttachmentHtml } from "./work-order-html";
import { statusLabel, t, type Locale, type MessageKey } from "./i18n";
import { loadOrgLocales } from "./user-locale";
import { ticketSiteName } from "./ticket-site";

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

function alertStatus(kind: "assigned" | "updated" | "opened", status: string): TicketStatus {
  if (kind === "assigned") return "ASSIGNED";
  if (kind === "opened") return "OPEN";
  return TICKET_STATUSES.includes(status as TicketStatus) ? (status as TicketStatus) : "OPEN";
}

function addRecipient(recipients: Map<string, Locale>, raw: string | null | undefined, locale: Locale) {
  const e164 = toE164(raw);
  if (!e164 || isPlaceholderUsNumber(e164) || recipients.has(e164)) return;
  recipients.set(e164, locale);
}

function addEmail(recipients: Map<string, Locale>, raw: string | null | undefined, locale: Locale) {
  const email = raw?.trim().toLowerCase() ?? "";
  if (!email.includes("@") || email.includes(" ") || recipients.has(email)) return;
  recipients.set(email, locale);
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function farmerPhones(farmer: { phone: string | null; contacts: { phone: string | null }[] }) {
  const recipients = new Map<string, Locale>();
  for (const contact of farmer.contacts) addRecipient(recipients, contact.phone, "en");
  if (farmer.contacts.length === 0) addRecipient(recipients, farmer.phone, "en");
  return [...recipients.keys()];
}

function farmerEmails(farmer: { email: string | null; contacts: { email: string | null }[] }) {
  const recipients = new Map<string, Locale>();
  for (const contact of farmer.contacts) addEmail(recipients, contact.email, "en");
  if (farmer.contacts.length === 0 || recipients.size === 0) addEmail(recipients, farmer.email, "en");
  return [...recipients.keys()];
}

async function farmerLocale(farmerId: string, locales: Map<string, Locale>): Promise<Locale> {
  const users = await prisma.user.findMany({
    where: { farmerId, role: ROLES.FARMER },
    select: { id: true },
  });
  return locales.get(users[0]?.id ?? "") ?? "en";
}

async function shopStaff(
  organizationId: string,
  storeId: string | null,
  roles: string[],
  actorUserId?: string | null,
) {
  const people = await prisma.user.findMany({
    where: { organizationId, role: { in: roles }, storeId: storeId ?? null },
    select: { id: true, phone: true, email: true },
  });
  return people.filter((person) => !(actorUserId && person.id === actorUserId));
}

async function chosenPeople(
  organizationId: string,
  userIds: string[],
  storeId: string | null,
  actorUserId?: string | null,
) {
  if (userIds.length === 0) return [];
  const people = await prisma.user.findMany({
    where: {
      organizationId,
      id: { in: userIds },
      role: { in: [...SHOP_STAFF_ROLES] },
      storeId: storeId ?? null,
    },
    select: { id: true, phone: true, email: true, name: true },
  });
  return people.filter((person) => !(actorUserId && person.id === actorUserId));
}

function phonesFrom(people: { id: string; phone: string | null }[], locales: Map<string, Locale>) {
  const recipients = new Map<string, Locale>();
  for (const person of people) addRecipient(recipients, person.phone, locales.get(person.id) ?? "en");
  return recipients;
}

function emailsFrom(people: { id: string; email: string }[], locales: Map<string, Locale>) {
  const recipients = new Map<string, Locale>();
  for (const person of people) addEmail(recipients, person.email, locales.get(person.id) ?? "en");
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
    pivot: { name: string } | null;
    asset?: { name: string; assetType?: { name: string } | null } | null;
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
    pivot: ticketSiteName(ticket),
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
  if (!org) return;
  const smsOn = sendsSms(org) && Boolean(org.birdApiKey);
  const emailOn = sendsEmail(org) && Boolean(org.resendApiKey && org.resendFrom);
  if (!smsOn && !emailOn) return;

  const ticket = await prisma.ticket.findFirst({
    where: { id: input.ticketId, organizationId: input.organizationId },
    include: {
      farmer: { select: { name: true, storeId: true } },
      pivot: true,
      asset: { include: { assetType: true } },
      technician: true,
    },
  });
  if (!ticket) return;

  const locales = await loadOrgLocales(input.organizationId);
  const phoneRecipients = new Map<string, Locale>();
  const emailRecipients = new Map<string, Locale>();
  const chosen = parseNotifyRecipients(org.notifyStatusJson);
  const statusKey = alertStatus(input.kind, ticket.status);
  const storeId = ticket.storeId ?? ticket.farmer.storeId;
  if (chosen.mode === "CHOSEN") {
    const smsPeople = await chosenPeople(input.organizationId, chosen.smsUserIds, storeId, input.actorUserId);
    const emailPeople = await chosenPeople(input.organizationId, chosen.emailUserIds, storeId, input.actorUserId);
    for (const [phone, locale] of phonesFrom(smsPeople, locales)) phoneRecipients.set(phone, locale);
    for (const [email, locale] of emailsFrom(emailPeople, locales)) emailRecipients.set(email, locale);
  } else if (input.kind === "assigned") {
    if (roleWants(org, "ASSIGNED", "tech", "sms") || roleWants(org, "ASSIGNED", "tech", "email")) {
      if (ticket.technician && ticket.technician.id !== input.actorUserId) {
        const locale = locales.get(ticket.technician.id) ?? "en";
        if (roleWants(org, "ASSIGNED", "tech", "sms")) addRecipient(phoneRecipients, ticket.technician.phone, locale);
        if (roleWants(org, "ASSIGNED", "tech", "email")) addEmail(emailRecipients, ticket.technician.email, locale);
      }
    }
  } else {
    const staffRoles = [
      [ROLES.ADMIN, "admin"],
      [ROLES.MANAGER, "manager"],
      [ROLES.CLERICAL, "office"],
    ] as const;
    for (const [role, alertRole] of staffRoles) {
      const wantSms = roleWants(org, statusKey, alertRole, "sms");
      const wantEmail = roleWants(org, statusKey, alertRole, "email");
      if (!wantSms && !wantEmail) continue;
      const people = await shopStaff(input.organizationId, storeId, [role], input.actorUserId);
      if (wantSms) {
        for (const [phone, locale] of phonesFrom(people, locales)) phoneRecipients.set(phone, locale);
      }
      if (wantEmail && !(alertRole === "office" && statusKey === "REPAIR_DONE")) {
        for (const [email, locale] of emailsFrom(people, locales)) emailRecipients.set(email, locale);
      }
    }
    if (ticket.technician && ticket.technician.id !== input.actorUserId) {
      const locale = locales.get(ticket.technician.id) ?? "en";
      if (roleWants(org, statusKey, "tech", "sms")) addRecipient(phoneRecipients, ticket.technician.phone, locale);
      if (roleWants(org, statusKey, "tech", "email")) addEmail(emailRecipients, ticket.technician.email, locale);
    }
  }

  const staffSms = phoneRecipients.size > 0 && (chosen.mode !== "CHOSEN" || anyStaffWants(org, statusKey, "sms"));
  const staffEmail = emailRecipients.size > 0 && (chosen.mode !== "CHOSEN" || anyStaffWants(org, statusKey, "email"));

  if (smsOn && staffSms && org.birdApiKey) {
    const config = {
      apiKey: org.birdApiKey,
      from: org.birdFrom || org.name.slice(0, 11),
      workspaceId: org.birdWorkspaceId || "",
      channelId: org.birdChannelId || "",
    };
    await Promise.allSettled(
      [...phoneRecipients.entries()].map(([to, locale]) =>
        sendBirdSms(config, to, staffSmsBody(locale, input.kind, org.name, ticket, input.note)).catch((error) => {
          console.error(`Bird SMS to ${to} failed`, error);
        }),
      ),
    );
  }

  const skipShortEmail = chosen.mode === "CHOSEN" && statusKey === "REPAIR_DONE";
  if (emailOn && !skipShortEmail && staffEmail && org.resendApiKey && org.resendFrom) {
    const resend = { apiKey: org.resendApiKey, from: org.resendFrom };
    await Promise.allSettled(
      [...emailRecipients.entries()].map(async ([to, locale]) => {
        const text = staffSmsBody(locale, input.kind, org.name, ticket, input.note);
        const result = await sendEmail({
          to,
          subject: t(locale, "email.notifySubject", { org: org.name, number: ticket.number }),
          text,
          html: `<p>${escapeHtml(text)}</p>`,
          fromName: org.name,
          resend,
        });
        if (!result.ok) console.error(`Alert email to ${to} failed`, result.error);
      }),
    );
  }

  if (statusKey !== "REPAIR_DONE") {
    await notifyCustomerProgress(org, input.organizationId, input.ticketId, statusKey);
  }
}

export async function sendTicketStatusSmsToFarmer(input: {
  organizationId: string;
  ticketId: string;
  status: TicketStatus;
}) {
  const org = await prisma.organization.findUnique({ where: { id: input.organizationId } });
  if (!org || !sendsSms(org) || !org.birdApiKey || !customerWants(org, input.status, "sms")) return;

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
      farmer: { include: { contacts: true } },
      pivot: true,
      organization: {
        select: {
          name: true,
          notifyChannel: true,
          birdSmsEnabled: true,
          resendApiKey: true,
          resendFrom: true,
          notifyStatusJson: true,
        },
      },
    },
  });
  if (!ticket || ticket.status !== "REPAIR_DONE") return;

  const locales = await loadOrgLocales(input.organizationId);
  const locale = await farmerLocale(ticket.farmerId, locales);
  const resend =
    sendsEmail(ticket.organization) && ticket.organization.resendApiKey && ticket.organization.resendFrom
      ? { apiKey: ticket.organization.resendApiKey, from: ticket.organization.resendFrom }
      : undefined;

  await sendTicketStatusSmsToFarmer({
    organizationId: input.organizationId,
    ticketId: input.ticketId,
    status: "REPAIR_DONE",
  });

  if (customerWants(ticket.organization, "REPAIR_DONE", "email")) {
    const farmerTargets = resend ? farmerEmails(ticket.farmer) : ticket.farmer.email ? [ticket.farmer.email] : [];
    await Promise.allSettled(
      farmerTargets.map((to) =>
        ticketRepairDoneEmail({
          to,
          organizationName: ticket.organization.name,
          farmerName: ticket.farmer.name,
          ticketNumber: ticket.number,
          title: ticket.title,
          pivotName: ticketSiteName(ticket),
          ticketId: ticket.id,
          locale,
          resend,
        }),
      ),
    );
  }

  const chosen = parseNotifyRecipients(ticket.organization.notifyStatusJson);
  const officeEmail =
    chosen.mode === "CHOSEN"
      ? anyStaffWants(ticket.organization, "REPAIR_DONE", "email")
      : roleWants(ticket.organization, "REPAIR_DONE", "office", "email");
  if (officeEmail) {
    await notifyStoreClericalRepairDone({
      organizationId: input.organizationId,
      ticketId: input.ticketId,
      locales,
      resend,
      emailUserIds: chosen.mode === "CHOSEN" ? chosen.emailUserIds : null,
    });
  }
}

async function notifyCustomerProgress(
  org: {
    name: string;
    birdApiKey: string | null;
    birdFrom: string | null;
    birdWorkspaceId: string | null;
    birdChannelId: string | null;
    resendApiKey: string | null;
    resendFrom: string | null;
    notifyChannel: string | null;
    birdSmsEnabled: boolean | null;
    notifyStatusJson: string | null;
  },
  organizationId: string,
  ticketId: string,
  status: TicketStatus,
) {
  const sms = Boolean(sendsSms(org) && org.birdApiKey && customerWants(org, status, "sms"));
  const email = Boolean(sendsEmail(org) && org.resendApiKey && org.resendFrom && customerWants(org, status, "email"));
  if (!sms && !email) return;

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, organizationId },
    include: { farmer: { include: { contacts: true } } },
  });
  if (!ticket) return;

  const locales = await loadOrgLocales(ticket.organizationId);
  const locale = await farmerLocale(ticket.farmerId, locales);
  const body = withTicketLink(
    t(locale, "sms.customerStatus", {
      org: org.name,
      number: ticket.number,
      title: ticket.title,
      status: statusLabel(locale, status),
    }),
    ticket.id,
  );

  if (sms && org.birdApiKey) {
    const config = {
      apiKey: org.birdApiKey,
      from: org.birdFrom || org.name.slice(0, 11),
      workspaceId: org.birdWorkspaceId || "",
      channelId: org.birdChannelId || "",
    };
    const phones = farmerPhones(ticket.farmer);
    await Promise.allSettled(
      phones.map((to) =>
        sendBirdSms(config, to, body).catch((error) => {
          console.error(`Bird SMS to ${to} failed`, error);
        }),
      ),
    );
  }

  if (email && org.resendApiKey && org.resendFrom) {
    const resend = { apiKey: org.resendApiKey, from: org.resendFrom };
    await Promise.allSettled(
      farmerEmails(ticket.farmer).map(async (to) => {
        const result = await sendEmail({
          to,
          subject: t(locale, "email.notifySubject", { org: org.name, number: ticket.number }),
          text: body,
          html: `<p>${escapeHtml(body)}</p>`,
          fromName: org.name,
          resend,
        });
        if (!result.ok) console.error(`Customer email to ${to} failed`, result.error);
      }),
    );
  }
}

async function notifyStoreClericalRepairDone(input: {
  organizationId: string;
  ticketId: string;
  locales: Map<string, Locale>;
  resend?: { apiKey: string; from: string };
  emailUserIds?: string[] | null;
}) {
  const ticket = await prisma.ticket.findFirst({
    where: { id: input.ticketId, organizationId: input.organizationId },
    include: {
      ...closedTicketPrintInclude,
      store: true,
    },
  });
  if (!ticket || ticket.status !== "REPAIR_DONE") return;

  if (input.emailUserIds && input.emailUserIds.length === 0) return;

  const storeId = ticket.storeId ?? ticket.farmer.storeId;
  const officeSelect = { id: true, name: true, email: true };
  const clerical =
    input.emailUserIds == null
      ? await prisma.user.findMany({
          where: {
            organizationId: input.organizationId,
            role: ROLES.CLERICAL,
            storeId: storeId ?? null,
            email: { not: "" },
          },
          select: officeSelect,
        })
      : await prisma.user.findMany({
          where: {
            organizationId: input.organizationId,
            id: { in: input.emailUserIds },
            role: { in: [...SHOP_STAFF_ROLES] },
            storeId: storeId ?? null,
            email: { not: "" },
          },
          select: officeSelect,
        });
  if (clerical.length === 0) return;

  const html = workOrderAttachmentHtml(ticket);
  const storeName =
    ticket.store?.name ||
    (await prisma.store.findFirst({ where: { id: storeId ?? "" }, select: { name: true } }))?.name ||
    "Office";

  await Promise.allSettled(
    clerical.map((person) =>
      officeRepairDoneEmail({
        to: person.email,
        firstName: person.name,
        organizationName: ticket.organization.name,
        organizationId: input.organizationId,
        farmerName: ticket.farmer.name,
        ticketNumber: ticket.number,
        title: ticket.title,
        pivotName: ticketSiteName(ticket),
        storeName,
        ticketId: ticket.id,
        attachmentHtml: html,
        locale: input.locales.get(person.id) ?? "en",
        resend: input.resend,
      }).catch((error) => {
        console.error(`Office repair-done email to ${person.email} failed`, error);
      }),
    ),
  );
}
