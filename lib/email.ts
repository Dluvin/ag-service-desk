import { appBaseUrl, brandLogoEmailHtml } from "./app-url";
import { mailIsConfigured, sendEmail } from "./mail";

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
}) {
  if (!mailIsConfigured()) return "skipped" as const;

  const first = input.farmerName.trim().split(/\s+/)[0] || "there";
  const workOrder = `work order #${input.ticketNumber}`;
  const url = workOrderUrl(input.ticketId);
  const subject = `${input.organizationName}: ${workOrder} is repaired and ready`;
  const text = [
    `Hi ${first},`,
    "",
    `${input.organizationName} finished the repair on ${workOrder} (${input.title}) for ${input.pivotName}.`,
    "The work is repaired and ready.",
    url ? `View the work order: ${url}` : "",
    "",
    "If you have questions, reply to your dealer.",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await sendEmail({
    to: input.to,
    subject,
    text,
    html: `
      ${brandLogoEmailHtml()}
      <p>Hi ${escapeHtml(first)},</p>
      <p>${escapeHtml(input.organizationName)} finished the repair on ${escapeHtml(workOrder)} (${escapeHtml(input.title)}) for ${escapeHtml(input.pivotName)}.</p>
      <p>The work is repaired and ready.</p>
      ${url ? `<p><a href="${escapeHtml(url)}">View the work order</a></p>` : ""}
      <p>If you have questions, reply to your dealer.</p>
    `,
  });
  return result.ok ? ("sent" as const) : ("failed" as const);
}
