export const PLAN = {
  name: "AG Desk Pro",
  monthlyDollars: 499,
  includedSeats: 10,
  extraSeatDollars: 19,
  trialDays: 15,
} as const;

export function extraStaffSeats(staffCount: number) {
  return Math.max(0, staffCount - PLAN.includedSeats);
}
