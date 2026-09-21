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
  OPEN: "Unassigned",
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

export const PRINTABLE_STATUSES: TicketStatus[] = ["REPAIR_DONE", "COMPLETED"];

export function isPrintableStatus(status: string) {
  return PRINTABLE_STATUSES.includes(status as TicketStatus);
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

export function canManageShopStaff(role: string) {
  return role === ROLES.ADMIN || role === ROLES.MANAGER;
}

export function canEditStaffMember(actorRole: string, targetRole: string) {
  if (actorRole === ROLES.ADMIN) {
    return targetRole === ROLES.ADMIN || targetRole === ROLES.MANAGER || targetRole === ROLES.TECHNICIAN;
  }
  if (actorRole === ROLES.MANAGER) {
    return targetRole === ROLES.MANAGER || targetRole === ROLES.TECHNICIAN;
  }
  return false;
}

export function staffRolesAssignableBy(actorRole: string) {
  if (actorRole === ROLES.ADMIN) return [ROLES.ADMIN, ROLES.MANAGER, ROLES.TECHNICIAN];
  if (actorRole === ROLES.MANAGER) return [ROLES.MANAGER, ROLES.TECHNICIAN];
  return [];
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
