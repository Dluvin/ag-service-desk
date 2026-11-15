import { TRIAL_DAYS, formatPlanCents, type ResolvedPlan } from "@/lib/plans";

function afterTrial(plan: ResolvedPlan) {
  const price = formatPlanCents(plan.monthlyCents);
  if (plan.perUser) return `Then ${price} per staff login on ${plan.label}.`;
  if (plan.includedUsers == null) return `Then ${price}/month on ${plan.label}, unlimited staff.`;
  const extra =
    plan.extraSeatCents > 0 ? `; extra seats ${formatPlanCents(plan.extraSeatCents)}/month` : "";
  return `Then ${price}/month for ${plan.includedUsers} staff seats on ${plan.label}${extra}.`;
}

export function TrialBanner({ trialEndsAt, plan }: { trialEndsAt: Date; plan: ResolvedPlan }) {
  const days = Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
  const later = afterTrial(plan);
  return (
    <div className="no-print border-b border-emerald-800 bg-emerald-900 px-4 py-2 text-sm text-emerald-50">
      <p className="mx-auto max-w-7xl">
        {days === 0
          ? `Trial ended. ${later}`
          : `${days} day${days === 1 ? "" : "s"} left in your ${TRIAL_DAYS}-day trial. ${later}`}
      </p>
    </div>
  );
}
