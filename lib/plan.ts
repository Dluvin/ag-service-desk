import { PLANS, TRIAL_DAYS, extraStaffSeatsFor, formatPlanCents } from "./plans";

const shop = PLANS.SHOP;

export const PLAN = {
  name: "AG Desk Pro",
  monthlyDollars: shop.monthlyCents / 100,
  includedSeats: shop.includedUsers ?? 10,
  extraSeatDollars: shop.extraSeatCents / 100,
  extraSeatLabel: formatPlanCents(shop.extraSeatCents),
  monthlyLabel: formatPlanCents(shop.monthlyCents),
  trialDays: TRIAL_DAYS,
} as const;

export function extraStaffSeats(staffCount: number, includedSeats = PLAN.includedSeats) {
  return extraStaffSeatsFor({ includedUsers: includedSeats, plan: "SHOP" }, staffCount);
}
