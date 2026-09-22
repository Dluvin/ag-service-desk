import { ActionForm } from "@/components/ActionForm";
import { updateTenantPlanAction } from "@/lib/platform-actions";
import {
  GPS_PROVIDERS,
  PLAN_IDS,
  PLANS,
  formatPlanCents,
  resolveEntitlements,
  type PlanOrg,
} from "@/lib/plans";

export function PlatformPlanForm({ org }: { org: PlanOrg & { id: string } }) {
  const entitlements = resolveEntitlements(org);
  return (
    <ActionForm action={updateTenantPlanAction} className="mt-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-3">
      <input type="hidden" name="organizationId" value={org.id} />
      <p className="text-sm font-semibold text-stone-800">
        Plan: {entitlements.label}
        {entitlements.mapsEnabled ? " · maps on" : " · no in-app maps"}
        {entitlements.gpsEnabled ? ` · GPS ${entitlements.gpsProvider}` : " · no live GPS"}
        {entitlements.maxStores != null ? ` · ${entitlements.maxStores} stores` : " · unlimited stores"}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-stone-600">
          Version
          <select name="plan" defaultValue={entitlements.plan} className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm">
            {PLAN_IDS.map((id) => (
              <option key={id} value={id}>
                {PLANS[id].label} · {formatPlanCents(PLANS[id].monthlyCents)}
                {PLANS[id].perUser ? "/user" : ""}/mo
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-stone-600">
          GPS provider
          <select
            name="gpsProvider"
            defaultValue={entitlements.gpsProvider}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm"
          >
            {GPS_PROVIDERS.map((provider) => (
              <option key={provider} value={provider}>
                {provider}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-stone-600">
          Store cap override
          <input
            name="maxStores"
            type="number"
            min={0}
            defaultValue={org.maxStores ?? ""}
            placeholder={entitlements.maxStores == null ? "Unlimited" : String(PLANS[entitlements.plan].maxStores ?? "")}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm"
          />
          <span className="mt-1 block font-normal text-stone-500">Blank = plan default. Shop more than 5 is contact sales, not auto-unlock.</span>
        </label>
        <label className="block text-xs font-medium text-stone-600">
          Included seats override
          <input
            name="includedUsers"
            type="number"
            min={1}
            defaultValue={org.includedUsers ?? ""}
            placeholder={entitlements.includedUsers == null ? "Unlimited" : String(entitlements.includedUsers)}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-stone-700 sm:col-span-2">
          <input type="checkbox" name="revealGps" value="1" defaultChecked={entitlements.revealGps} />
          Reveal GPS add-on ({formatPlanCents(PLANS.SHOP.revealAddOnCents)}/month on Shop)
        </label>
      </div>
      <button className="mt-3 rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-stone-800">
        Save plan
      </button>
    </ActionForm>
  );
}
