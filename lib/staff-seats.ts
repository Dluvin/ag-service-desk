import { ROLES } from "./roles";

/** Staff/helper technicians included free with each Lead Technician. */
export const FREE_HELPERS_PER_LEAD = 3;

export type StaffSeatUser = { role: string };

export function freeHelperAllowance(leadCount: number) {
  return Math.max(0, leadCount) * FREE_HELPERS_PER_LEAD;
}

export function staffSeatBreakdown(users: StaffSeatUser[]) {
  const leadCount = users.filter((user) => user.role === ROLES.TECH_LEAD).length;
  const helperCount = users.filter((user) => user.role === ROLES.TECHNICIAN).length;
  const otherCount = users.filter(
    (user) => user.role !== ROLES.TECH_LEAD && user.role !== ROLES.TECHNICIAN,
  ).length;
  const freeHelpers = Math.min(helperCount, freeHelperAllowance(leadCount));
  const paidHelpers = helperCount - freeHelpers;
  const billable = otherCount + leadCount + paidHelpers;
  return {
    total: users.length,
    leadCount,
    helperCount,
    otherCount,
    freeHelpers,
    freeAllowance: freeHelperAllowance(leadCount),
    paidHelpers,
    billable,
  };
}

/** Billable seats after applying free helpers (3 per lead). */
export function billableStaffCount(users: StaffSeatUser[]) {
  return staffSeatBreakdown(users).billable;
}

export function summarizeStaffSeats(users: StaffSeatUser[]) {
  const b = staffSeatBreakdown(users);
  const parts = [
    `${b.total} staff`,
    `${b.leadCount} lead tech${b.leadCount === 1 ? "" : "s"}`,
    `${b.helperCount} staff tech${b.helperCount === 1 ? "" : "s"} (${b.freeHelpers} free of ${b.freeAllowance})`,
    `${b.billable} billable`,
  ];
  return parts.join(" · ");
}
