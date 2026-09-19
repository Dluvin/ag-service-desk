import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPlatformSession } from "@/lib/platform";
import { ROLES } from "@/lib/roles";
import { PlatformHeader } from "@/components/PlatformHeader";
import { ActionForm } from "@/components/ActionForm";
import {
  deleteTenantAction,
  impersonateTenantAction,
  pauseTenantAction,
} from "@/lib/platform-actions";

export const dynamic = "force-dynamic";

export default async function PlatformHomePage() {
  const session = await getPlatformSession();
  if (!session) redirect("/platform/login");

  const tenants = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { tickets: true, farmers: true } },
      users: {
        where: { role: { in: [ROLES.ADMIN, ROLES.MANAGER, ROLES.TECHNICIAN] } },
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
          Open a company as their admin to help with setup, training, or troubleshooting. Pause
          blocks their staff and farm logins. Delete removes the company and all of its data.
        </p>
        <ul className="mt-6 space-y-4">
          {tenants.length === 0 ? (
            <li className="rounded-xl border border-stone-200 bg-white px-4 py-6 text-sm text-stone-600">
              No companies yet.
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
                        {org.paused ? (
                          <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                            Paused
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-sm text-stone-600">
                        {org.slug} · {staff} staff · {org._count.farmers} farms · {org._count.tickets}{" "}
                        tickets
                        {adminEmail ? ` · ${adminEmail}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
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
