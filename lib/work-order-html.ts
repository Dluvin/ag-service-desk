import { STATUS_LABELS, type TicketStatus } from "./roles";
import { ticketSiteName } from "./ticket-site";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

function row(label: string, value: string) {
  if (!value) return "";
  return `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`;
}

type PrintTicket = {
  number: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  invoiceNumber: string | null;
  invoiceAmount: number | null;
  createdAt: Date;
  scheduledAt: Date | null;
  closedAt: Date | null;
  updatedAt: Date;
  organization: { name: string };
  farmer: {
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    contacts?: { name: string; phone: string | null; email: string | null }[];
  };
  pivot?: { name: string; serialNumber: string | null; locationNote: string | null } | null;
  asset?: { name: string; serialNumber: string | null; locationNote: string | null; assetType?: { name: string } | null } | null;
  technician: { name: string } | null;
  store?: { name: string } | null;
  parts: { quantity: number; name: string; sku: string | null; unitPrice: number | null }[];
  labor?: { hours: number; name: string; sku: string | null; unitRate: number | null }[];
  equipment?: { hours: number; name: string; sku: string | null; unitRate: number | null }[];
  updates: { message: string; status: string | null; createdAt: Date; user: { name: string } }[];
};

function lineTable(
  headers: string[],
  body: string,
  footer?: string,
) {
  if (!body) return `<p>None logged.</p>`;
  return `<table class="lines"><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${body}</tbody>${footer ?? ""}</table>`;
}

export function workOrderAttachmentHtml(ticket: PrintTicket) {
  const labor = ticket.labor ?? [];
  const equipment = ticket.equipment ?? [];
  const partsTotal = ticket.parts.reduce((sum, part) => sum + part.quantity * (part.unitPrice ?? 0), 0);
  const laborTotal = labor.reduce((sum, item) => sum + item.hours * (item.unitRate ?? 0), 0);
  const equipmentTotal = equipment.reduce((sum, item) => sum + item.hours * (item.unitRate ?? 0), 0);
  const hasPrices = ticket.parts.some((part) => part.unitPrice != null);
  const hasLaborRates = labor.some((item) => item.unitRate != null);
  const hasEquipmentRates = equipment.some((item) => item.unitRate != null);
  const contacts =
    ticket.farmer.contacts?.length
      ? ticket.farmer.contacts
      : [{ name: ticket.farmer.name, phone: ticket.farmer.phone, email: ticket.farmer.email }];
  const site = ticketSiteName(ticket);
  const status = STATUS_LABELS[ticket.status as TicketStatus] ?? ticket.status;

  const partsBody = ticket.parts
    .map(
      (part) =>
        `<tr><td>${part.quantity}</td><td>${escapeHtml(part.name)}</td><td>${escapeHtml(part.sku ?? "—")}</td>${
          hasPrices
            ? `<td>${part.unitPrice != null ? money(part.unitPrice) : "—"}</td><td>${
                part.unitPrice != null ? money(part.quantity * part.unitPrice) : "—"
              }</td>`
            : ""
        }</tr>`,
    )
    .join("");
  const laborBody = labor
    .map(
      (item) =>
        `<tr><td>${item.hours}</td><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.sku ?? "—")}</td>${
          hasLaborRates
            ? `<td>${item.unitRate != null ? money(item.unitRate) : "—"}</td><td>${
                item.unitRate != null ? money(item.hours * item.unitRate) : "—"
              }</td>`
            : ""
        }</tr>`,
    )
    .join("");
  const equipmentBody = equipment
    .map(
      (item) =>
        `<tr><td>${item.hours}</td><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.sku ?? "—")}</td>${
          hasEquipmentRates
            ? `<td>${item.unitRate != null ? money(item.unitRate) : "—"}</td><td>${
                item.unitRate != null ? money(item.hours * item.unitRate) : "—"
              }</td>`
            : ""
        }</tr>`,
    )
    .join("");

  const notes = ticket.updates
    .map(
      (update) =>
        `<li><p class="meta">${escapeHtml(update.user.name)} · ${update.createdAt.toLocaleString()}${
          update.status ? ` · ${escapeHtml(STATUS_LABELS[update.status as TicketStatus] ?? update.status)}` : ""
        }</p><p>${escapeHtml(update.message).replaceAll("\n", "<br/>")}</p></li>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Work order #${ticket.number}</title>
<style>
  body { font-family: Arial, sans-serif; color: #1c1917; margin: 24px; }
  h1, h2 { font-weight: 700; }
  h1 { font-size: 24px; margin: 16px 0 8px; }
  h2 { font-size: 16px; margin: 24px 0 8px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; padding: 4px 8px 4px 0; vertical-align: top; }
  .facts th { width: 8rem; color: #57534e; font-weight: 600; }
  .lines th, .lines td { border-bottom: 1px solid #e7e5e4; }
  .meta { color: #78716c; font-size: 12px; margin: 0 0 4px; }
  ul { padding-left: 18px; }
</style>
</head>
<body>
  <p><strong>${escapeHtml(ticket.organization.name)}</strong> · Work order · Repair done</p>
  <p>Work order #${ticket.number}${ticket.invoiceNumber ? ` · Invoice ${escapeHtml(ticket.invoiceNumber)}` : ""}${
    ticket.invoiceAmount != null ? ` · ${money(ticket.invoiceAmount)}` : ""
  }</p>
  <h1>${escapeHtml(ticket.title)}</h1>
  <p>${escapeHtml(status)} · ${escapeHtml(ticket.priority)}</p>
  <p>${escapeHtml(ticket.description).replaceAll("\n", "<br/>")}</p>
  <table class="facts">
    ${row("Customer", ticket.farmer.name)}
    ${row("Address", ticket.farmer.address ?? "")}
    ${contacts.map((c) => row("Contact", [c.name, c.phone, c.email].filter(Boolean).join(" · "))).join("")}
    ${row("Asset", site)}
    ${row("Technician", ticket.technician?.name ?? "Unassigned")}
    ${row("Store", ticket.store?.name ?? "")}
    ${row("Opened", ticket.createdAt.toLocaleString())}
    ${row("Scheduled", ticket.scheduledAt ? ticket.scheduledAt.toLocaleString() : "")}
  </table>
  <h2>Parts used</h2>
  ${lineTable(
    hasPrices ? ["Qty", "Part", "SKU", "Each", "Amount"] : ["Qty", "Part", "SKU"],
    partsBody,
    hasPrices
      ? `<tfoot><tr><td colspan="4">Parts total</td><td>${money(partsTotal)}</td></tr></tfoot>`
      : undefined,
  )}
  <h2>Labor</h2>
  ${lineTable(
    hasLaborRates ? ["Hours", "Labor", "Code", "Rate", "Amount"] : ["Hours", "Labor", "Code"],
    laborBody,
    hasLaborRates
      ? `<tfoot><tr><td colspan="4">Labor total</td><td>${money(laborTotal)}</td></tr></tfoot>`
      : undefined,
  )}
  <h2>Equipment used</h2>
  ${lineTable(
    hasEquipmentRates ? ["Hours", "Equipment", "Code", "Rate", "Amount"] : ["Hours", "Equipment", "Code"],
    equipmentBody,
    hasEquipmentRates
      ? `<tfoot><tr><td colspan="4">Equipment total</td><td>${money(equipmentTotal)}</td></tr></tfoot>`
      : undefined,
  )}
  <h2>Work notes</h2>
  <ul>${notes || "<li>None yet.</li>"}</ul>
</body>
</html>`;
}

export function workOrderAttachmentFilename(ticketNumber: number) {
  return `work-order-${ticketNumber}.html`;
}
