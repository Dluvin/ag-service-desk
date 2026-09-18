export const ROLES = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  TECHNICIAN: "TECHNICIAN",
  FARMER: "FARMER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const TICKET_STATUSES = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_PARTS",
  "REPAIR_DONE",
  "COMPLETED",
  "CANCELLED",
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Open",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress",
  WAITING_PARTS: "Waiting on parts",
  REPAIR_DONE: "Repair done",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const DISPATCH_STATUSES: TicketStatus[] = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_PARTS",
  "REPAIR_DONE",
];

export const OPEN_TICKET_STATUSES: TicketStatus[] = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_PARTS",
];

export const FINISHED_STATUSES: TicketStatus[] = ["COMPLETED", "CANCELLED"];

export function requiresInvoice(status: string) {
  return status === "COMPLETED";
}

export function isPrintableStatus(status: string) {
  return status === "COMPLETED";
}

export function isFinishedStatus(status: string) {
  return FINISHED_STATUSES.includes(status as TicketStatus);
}

export const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export type Priority = (typeof PRIORITIES)[number];

export function isAdmin(role: string) {
  return role === ROLES.ADMIN;
}

export function canAssignTickets(role: string) {
  return role === ROLES.ADMIN || role === ROLES.MANAGER;
}

export function canEditStartupChecklist(role: string) {
  return role === ROLES.ADMIN || role === ROLES.MANAGER;
}

export function canAddTechnicians(role: string) {
  return role === ROLES.ADMIN || role === ROLES.MANAGER;
}

export function canImportPivots(role: string) {
  return role === ROLES.ADMIN;
}

export function canImportStaff(role: string) {
  return role === ROLES.ADMIN;
}

export function canManageParts(role: string) {
  return role === ROLES.ADMIN || role === ROLES.MANAGER;
}

export function canDeleteRecords(role: string) {
  return role === ROLES.ADMIN;
}

export function isShopStaff(role: string) {
  return role === ROLES.ADMIN || role === ROLES.MANAGER || role === ROLES.TECHNICIAN;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}
