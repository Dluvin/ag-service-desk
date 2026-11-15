import { TICKET_STATUSES, type TicketStatus } from "./roles";

export const ALERT_ROLES = ["admin", "manager", "office", "tech"] as const;
export type AlertRole = (typeof ALERT_ROLES)[number];

export type StatusAlert = {
  adminSms: boolean;
  adminEmail: boolean;
  managerSms: boolean;
  managerEmail: boolean;
  officeSms: boolean;
  officeEmail: boolean;
  techSms: boolean;
  techEmail: boolean;
  customerSms: boolean;
  customerEmail: boolean;
};

export type StatusAlertMap = Record<TicketStatus, StatusAlert>;

const ROLE_FIELDS = [
  "adminSms",
  "adminEmail",
  "managerSms",
  "managerEmail",
  "officeSms",
  "officeEmail",
  "techSms",
  "techEmail",
  "customerSms",
  "customerEmail",
] as const satisfies readonly (keyof StatusAlert)[];

function defaultAlert(status: TicketStatus): StatusAlert {
  const repairDone = status === "REPAIR_DONE";
  const assigned = status === "ASSIGNED";
  return {
    adminSms: false,
    adminEmail: false,
    managerSms: true,
    managerEmail: true,
    officeSms: repairDone,
    officeEmail: repairDone,
    techSms: assigned,
    techEmail: assigned,
    customerSms: repairDone,
    customerEmail: repairDone,
  };
}

export function defaultStatusAlerts(): StatusAlertMap {
  return Object.fromEntries(TICKET_STATUSES.map((status) => [status, defaultAlert(status)])) as StatusAlertMap;
}

function asBool(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

type LegacyRow = Partial<StatusAlert> & { shopSms?: boolean; shopEmail?: boolean };

export function parseStatusAlerts(raw: string | null | undefined): StatusAlertMap {
  const alerts = defaultStatusAlerts();
  if (!raw) return alerts;
  try {
    const parsed = JSON.parse(raw) as Partial<Record<TicketStatus, LegacyRow>>;
    for (const status of TICKET_STATUSES) {
      const row = parsed?.[status];
      if (!row) continue;
      const base = alerts[status];
      const managerSms = asBool(row.managerSms, asBool(row.shopSms, base.managerSms));
      const managerEmail = asBool(row.managerEmail, asBool(row.shopEmail, base.managerEmail));
      alerts[status] = {
        adminSms: asBool(row.adminSms, base.adminSms),
        adminEmail: asBool(row.adminEmail, base.adminEmail),
        managerSms,
        managerEmail,
        officeSms: asBool(row.officeSms, base.officeSms),
        officeEmail: asBool(row.officeEmail, base.officeEmail),
        techSms: asBool(row.techSms, base.techSms),
        techEmail: asBool(row.techEmail, base.techEmail),
        customerSms: asBool(row.customerSms, base.customerSms),
        customerEmail: asBool(row.customerEmail, base.customerEmail),
      };
    }
  } catch {
    return defaultStatusAlerts();
  }
  return alerts;
}

export function statusAlertsFromForm(formData: FormData): StatusAlertMap {
  const alerts = defaultStatusAlerts();
  for (const status of TICKET_STATUSES) {
    const next = { ...alerts[status] };
    for (const field of ROLE_FIELDS) {
      next[field] = formData.get(`${field}.${status}`) === "on";
    }
    alerts[status] = next;
  }
  return alerts;
}

export function roleWants(
  org: { notifyStatusJson?: string | null },
  status: TicketStatus,
  role: AlertRole,
  channel: "sms" | "email",
) {
  const row = parseStatusAlerts(org.notifyStatusJson)[status];
  const key = `${role}${channel === "sms" ? "Sms" : "Email"}` as keyof StatusAlert;
  return row[key];
}

export function anyStaffWants(
  org: { notifyStatusJson?: string | null },
  status: TicketStatus,
  channel: "sms" | "email",
) {
  return ALERT_ROLES.some((role) => roleWants(org, status, role, channel));
}

export function customerWants(
  org: { notifyStatusJson?: string | null },
  status: TicketStatus,
  channel: "sms" | "email",
) {
  const row = parseStatusAlerts(org.notifyStatusJson)[status];
  return channel === "sms" ? row.customerSms : row.customerEmail;
}
