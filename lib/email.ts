import { appBaseUrl, brandLogoEmailHtml } from "./app-url";
import { mailIsConfigured, sendEmail } from "./mail";
import { t, type Locale } from "./i18n";
import { tenantBrandEmailHtml } from "./org-brand";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function workOrderUrl(ticketId: string) {
  const base = appBaseUrl();
  return base ? `${base}/tickets/${ticketId}` : "";
}

export async function ticketRepairDoneEmail(input: {
  to: string;
  organizationName: string;
  farmerName: string;
  ticketNumber: number;
  title: string;
  pivotName: string;
  ticketId: string;
  locale?: Locale;
}) {
  if (!mailIsConfigured()) return "skipped" as const;

  const locale = input.locale ?? "en";
  const first = input.farmerName.trim().split(/\s+/)[0] || t(locale, "email.there");
  const url = workOrderUrl(input.ticketId);
  const vars = {
    first,
    org: input.organizationName,
    number: input.ticketNumber,
    title: input.title,
    pivot: input.pivotName,
    url,
  };
  const subject = t(locale, "email.repairSubject", vars);
  const text = [
    t(locale, "email.repairHi", vars),
    "",
    t(locale, "email.repairBody", vars),
    t(locale, "email.repairReady"),
    url ? t(locale, "email.repairViewLine", vars) : "",
    "",
    t(locale, "email.repairQuestions"),
  ]
    .filter(Boolean)
    .join("\n");

  const result = await sendEmail({
    to: input.to,
    subject,
    text,
    html: `
      ${brandLogoEmailHtml()}
      <p>${escapeHtml(t(locale, "email.repairHi", vars))}</p>
      <p>${escapeHtml(t(locale, "email.repairBody", vars))}</p>
      <p>${escapeHtml(t(locale, "email.repairReady"))}</p>
      ${url ? `<p><a href="${escapeHtml(url)}">${escapeHtml(t(locale, "email.repairView"))}</a></p>` : ""}
      <p>${escapeHtml(t(locale, "email.repairQuestions"))}</p>
    `,
  });
  return result.ok ? ("sent" as const) : ("failed" as const);
}

export async function officeRepairDoneEmail(input: {
  to: string;
  firstName: string;
  organizationName: string;
  organizationId: string;
  farmerName: string;
  ticketNumber: number;
  title: string;
  pivotName: string;
  storeName: string;
  ticketId: string;
  attachmentHtml: string;
  locale?: Locale;
}) {
  if (!mailIsConfigured()) return "skipped" as const;

  const locale = input.locale ?? "en";
  const first = input.firstName.trim().split(/\s+/)[0] || t(locale, "email.there");
  const url = workOrderUrl(input.ticketId);
  const vars = {
    first,
    org: input.organizationName,
    number: input.ticketNumber,
    title: input.title,
    customer: input.farmerName,
    pivot: input.pivotName,
    store: input.storeName,
    url,
  };
  const subject = t(locale, "email.officeRepairSubject", vars);
  const text = [
    t(locale, "email.officeRepairHi", vars),
    "",
    t(locale, "email.officeRepairBody", vars),
    url ? t(locale, "email.officeRepairViewLine", vars) : "",
  ]
    .filter(Boolean)
    .join("\n");

  const brand = await tenantBrandEmailHtml(input.organizationId, input.organizationName);
  const result = await sendEmail({
    to: input.to,
    fromName: input.organizationName,
    subject,
    text,
    html: `
      ${brand}
      <p>${escapeHtml(t(locale, "email.officeRepairHi", vars))}</p>
      <p>${escapeHtml(t(locale, "email.officeRepairBody", vars))}</p>
      ${url ? `<p><a href="${escapeHtml(url)}">${escapeHtml(t(locale, "email.repairView"))}</a></p>` : ""}
    `,
    attachments: [
      {
        filename: `work-order-${input.ticketNumber}.html`,
        content: Buffer.from(input.attachmentHtml, "utf8"),
        contentType: "text/html; charset=utf-8",
      },
    ],
  });
  return result.ok ? ("sent" as const) : ("failed" as const);
}
