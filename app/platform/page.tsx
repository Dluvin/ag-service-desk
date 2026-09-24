import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPlatformSession } from "@/lib/platform";
import { ROLES, SHOP_STAFF_ROLES } from "@/lib/roles";
import { PlatformHeader } from "@/components/PlatformHeader";
import { ActionForm } from "@/components/ActionForm";
import {
  approveTenantAction,
  createBillingCheckoutAction,
  deleteTenantAction,
  impersonateTenantAction,
  pauseTenantAction,
  rejectTenantAction,
} from "@/lib/platform-actions";
import { PLAN } from "@/lib/plan";
import { PlatformPlanForm } from "@/components/PlatformPlanForm";
import { renameDemoIrrigationCompany } from "@/lib/rename-demo-irrigation";

export const dynamic = "force-dynamic";

export default async function PlatformHomePage() {
  const session = await getPlatformSession();
  if (!session) redirect("/platform/login");

  await renameDemoIrrigationCompany();

  const tenants = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { tickets: true, farmers: true } },
      users: {
        where: { role: { in: [...SHOP_STAFF_ROLES] } },
        select: { id: true, role: true, email: true },
      },
    },
  });

  return (
    <div className="min-h-full bg-stone-100">
      <PlatformHeader session={session} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="font-display text-3xl text-stone-900">Companies</h1>
        <p className="mt-2 text-sm text-stone-600">
          Dealers sign up at{" "}
          <Link href="/signup" className="font-semibold text-emerald-800 hover:underline">
            Start a company
          </Link>
          {" "}
          (<span className="font-mono text-xs">/signup</span>). New companies stay pending until you
          approve. Approve opens their tenant, loads a demo customer/work order, and starts a {PLAN.trialDays}-day
          trial. Existing companies stay on Shop so live dealers keep in-app maps. Set plan, Reveal add-on, GPS
          provider, and store cap below — Stripe checkout is not wired to these prices yet.
        </p>
        <ul className="mt-6 space-y-4">
          {tenants.length === 0 ? (
            <li className="rounded-xl border border-stone-200 bg-white px-4 py-6 text-sm text-stone-600">
              No companies yet. Send a dealer to{" "}
              <Link href="/signup" className="font-semibold text-emerald-800 hover:underline">
                Start a company
              </Link>
              , then refresh this page. Homepage demo requests do not create a company.
            </li>
          ) : (
            tenants.map((org) => {
              const staff = org.users.length;
              const adminEmail = org.users.find((user) => user.role === ROLES.ADMIN)?.email;
              return (
                <li key={org.id} className="rounded-xl border border-stone-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-stone-900">
                        {org.name}
                        {org.signupStatus === "PENDING" ? (
                          <span className="ml-2 rounded bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-900">
                            Pending approval
                          </span>
                        ) : null}
                        {org.signupStatus === "REJECTED" ? (
                          <span className="ml-2 rounded bg-stone-200 px-2 py-0.5 text-xs font-semibold text-stone-700">
                            Rejected
                          </span>
                        ) : null}
                        {org.paused && org.signupStatus === "ACTIVE" ? (
                          <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                            Paused
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-sm text-stone-600">
                        {org.slug} · {staff} staff · {org._count.farmers} customers · {org._count.tickets}{" "}
                        work orders
                        {adminEmail ? ` · ${adminEmail}` : ""}
                      </p>
                      {org.signupPhone || org.signupCity ? (
                        <p className="mt-1 text-xs text-stone-500">
                          {[org.signupTitle, org.signupPhone, org.signupAddress, org.signupCity, org.signupRegion, org.signupPostalCode]
                            .filter(Boolean)
                            .join(" · ")}
                          {org.signupStaffCount ? ` · Staff ~ ${org.signupStaffCount}` : ""}
                        </p>
                      ) : null}
                      {org.signupNotes ? <p className="mt-1 text-xs text-stone-500">{org.signupNotes}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {org.signupStatus === "PENDING" ? (
                        <>
                          <ActionForm action={approveTenantAction}>
                            <input type="hidden" name="organizationId" value={org.id} />
                            <button className="rounded-lg bg-emerald-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700">
                              Approve + billing
                            </button>
                          </ActionForm>
                          <ActionForm action={rejectTenantAction}>
                            <input type="hidden" name="organizationId" value={org.id} />
                            <button className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold hover:bg-stone-50">
                              Reject
                            </button>
                          </ActionForm>
                        </>
                      ) : null}
                      <ActionForm action={impersonateTenantAction}>
                        <input type="hidden" name="organizationId" value={org.id} />
                        <button className="rounded-lg bg-emerald-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700">
                          Open company
                        </button>
                      </ActionForm>
                      <ActionForm action={pauseTenantAction}>
                        <input type="hidden" name="organizationId" value={org.id} />
                        <input type="hidden" name="paused" value={org.paused ? "0" : "1"} />
                        <button className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold hover:bg-stone-50">
                          {org.paused ? "Resume access" : "Pause access"}
                        </button>
                      </ActionForm>
                    </div>
                  </div>
                  <PlatformPlanForm org={org} />
                  {org.stripeSubscriptionId ? (
                    <p className="mt-2 text-sm font-medium text-emerald-800">Stripe subscription is on file.</p>
                  ) : (
                    <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
                      {org.stripeCheckoutUrl ? (
                        <p className="text-sm">
                          <a
                            href={org.stripeCheckoutUrl}
                            className="font-semibold text-emerald-800 hover:underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open Stripe checkout
                          </a>
                          <span className="mt-1 block text-xs text-stone-500">
                            This is the card form for the 15-day trial then $499/month. Creating a
                            link also emails it to the company admin. Links expire in 24 hours.
                          </span>
                        </p>
                      ) : (
                        <p className="text-sm text-stone-600">
                          No Stripe checkout link yet. Usually STRIPE_SECRET_KEY or STRIPE_PRICE_BASE
                          is missing on Render, or checkout failed when you approved.
                        </p>
                      )}
                      <ActionForm action={createBillingCheckoutAction} className="mt-2">
                        <input type="hidden" name="organizationId" value={org.id} />
                        <button className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-stone-800">
                          {org.stripeCheckoutUrl ? "Create a new checkout link" : "Create Stripe checkout"}
                        </button>
                      </ActionForm>
                    </div>
                  )}
                  <ActionForm action={deleteTenantAction} className="mt-4 border-t border-stone-100 pt-3">
                    <input type="hidden" name="organizationId" value={org.id} />
                    <label className="block text-xs font-medium text-stone-600">
                      Type {org.name} to delete this company
                      <input
                        name="confirmName"
                        className="mt-1 w-full max-w-sm rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
                        placeholder={org.name}
                      />
                    </label>
                    <button
                      type="submit"
                      className="mt-2 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-800 hover:bg-red-50"
                    >
                      Delete company
                    </button>
                  </ActionForm>
                </li>
              );
            })
          )}
        </ul>
      </main>
    </div>
  );
}
