export const ROLES = {
  ADMIN: "ADMIN",
  TECHNICIAN: "TECHNICIAN",
  FARMER: "FARMER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const TICKET_STATUSES = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_PARTS",
  "COMPLETED",
  "CANCELLED",
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Open",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress",
  WAITING_PARTS: "Waiting on parts",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export type Priority = (typeof PRIORITIES)[number];

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}
