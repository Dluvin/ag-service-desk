import { PLAN } from "@/lib/plan";

export function TrialBanner({ trialEndsAt }: { trialEndsAt: Date }) {
  const days = Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
  return (
    <div className="no-print border-b border-emerald-800 bg-emerald-900 px-4 py-2 text-sm text-emerald-50">
      <p className="mx-auto max-w-7xl">
        {days === 0
          ? `Trial ended. Plan is $${PLAN.monthlyDollars}/month for ${PLAN.includedSeats} staff seats (extras $${PLAN.extraSeatDollars}/month).`
          : `${days} day${days === 1 ? "" : "s"} left in your ${PLAN.trialDays}-day trial. Then $${PLAN.monthlyDollars}/month for ${PLAN.includedSeats} staff seats; extra seats $${PLAN.extraSeatDollars}/month.`}
      </p>
    </div>
  );
}
