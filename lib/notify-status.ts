import { TICKET_STATUSES, type TicketStatus } from "./roles";

export type StatusAlert = {
  shopSms: boolean;
  shopEmail: boolean;
  customerSms: boolean;
  customerEmail: boolean;
};

export type StatusAlertMap = Record<TicketStatus, StatusAlert>;

function defaultAlert(status: TicketStatus): StatusAlert {
  const customer = status === "REPAIR_DONE";
  return {
    shopSms: true,
    shopEmail: true,
    customerSms: customer,
    customerEmail: customer,
  };
}

export function defaultStatusAlerts(): StatusAlertMap {
  return Object.fromEntries(TICKET_STATUSES.map((status) => [status, defaultAlert(status)])) as StatusAlertMap;
}

function asBool(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

export function parseStatusAlerts(raw: string | null | undefined): StatusAlertMap {
  const alerts = defaultStatusAlerts();
  if (!raw) return alerts;
  try {
    const parsed = JSON.parse(raw) as Partial<Record<TicketStatus, Partial<StatusAlert>>>;
    for (const status of TICKET_STATUSES) {
      const row = parsed?.[status];
      if (!row) continue;
      const base = alerts[status];
      alerts[status] = {
        shopSms: asBool(row.shopSms, base.shopSms),
        shopEmail: asBool(row.shopEmail, base.shopEmail),
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
    alerts[status] = {
      shopSms: formData.get(`shopSms.${status}`) === "on",
      shopEmail: formData.get(`shopEmail.${status}`) === "on",
      customerSms: formData.get(`customerSms.${status}`) === "on",
      customerEmail: formData.get(`customerEmail.${status}`) === "on",
    };
  }
  return alerts;
}

export function shopWants(
  org: { notifyStatusJson?: string | null },
  status: TicketStatus,
  channel: "sms" | "email",
) {
  const row = parseStatusAlerts(org.notifyStatusJson)[status];
  return channel === "sms" ? row.shopSms : row.shopEmail;
}

export function customerWants(
  org: { notifyStatusJson?: string | null },
  status: TicketStatus,
  channel: "sms" | "email",
) {
  const row = parseStatusAlerts(org.notifyStatusJson)[status];
  return channel === "sms" ? row.customerSms : row.customerEmail;
}
