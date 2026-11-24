export const SALE_STATUSES = [
  "LEAD",
  "FOLLOW_UP",
  "QUOTING",
  "QUOTED",
  "SOLD",
  "IN_PROGRESS",
  "COMPLETED",
  "ON_HOLD",
  "LOST",
] as const;

export type SaleStatus = (typeof SALE_STATUSES)[number];

export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  LEAD: "Lead",
  FOLLOW_UP: "Follow up",
  QUOTING: "Quoting",
  QUOTED: "Quoted",
  SOLD: "Sold",
  IN_PROGRESS: "Sold / in progress",
  COMPLETED: "Completed",
  ON_HOLD: "On hold",
  LOST: "Lost",
};

export function isSaleStatus(value: string): value is SaleStatus {
  return SALE_STATUSES.includes(value as SaleStatus);
}

export function saleStatusLabel(status: string) {
  return isSaleStatus(status) ? SALE_STATUS_LABELS[status] : status;
}

/** Statuses that mean the deal is finished and an asset should exist. */
export function isSaleFinished(status: string) {
  return status === "COMPLETED";
}

/** Open pipeline statuses (not done / lost). */
export function isOpenSale(status: string) {
  return status !== "COMPLETED" && status !== "LOST";
}

export function parseSaleDateInput(value: string) {
  const text = value.trim();
  if (!text) return null;
  // date input YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const date = new Date(`${text}T12:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function saleDateInputValue(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatSaleDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
