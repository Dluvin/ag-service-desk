import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canDeleteRecords, isAdmin } from "@/lib/roles";
import { createStoreAction, deleteStoreAction, updateStoreAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { DeleteButton } from "@/components/DeleteButton";
import { ContactSalesNote } from "@/components/ContactSalesNote";
import { loadOrgPlan } from "@/lib/org-plan";
import { canAddStore, contactSalesStoreMessage } from "@/lib/plans";

export default async function StoresPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isAdmin(session.role)) redirect("/dashboard");

  const [stores, plan] = await Promise.all([
    prisma.store.findMany({
      where: { organizationId: session.organizationId },
      include: { _count: { select: { farmers: true } } },
      orderBy: { name: "asc" },
    }),
    loadOrgPlan(session.organizationId),
  ]);
  const allowStore = plan ? canAddStore(plan.org, stores.length) : true;

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <h1 className="font-display text-3xl">Stores</h1>
        <p className="mt-1 text-sm text-stone-600">
          Use stores to split dashboard and dispatch by shop. Customers pick a default store so their
          work orders show with that location.
        </p>
        <ul className="mt-6 space-y-3">
          {stores.length === 0 ? (
            <li className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600">
              No stores yet.
            </li>
          ) : (
            stores.map((store) => (
              <li key={store.id} className="rounded-xl border border-stone-200 bg-white p-4">
                <ActionForm action={updateStoreAction} className="space-y-3">
                  <input type="hidden" name="storeId" value={store.id} />
                  <label className="block text-sm font-medium">
                    Name
                    <input name="name" required defaultValue={store.name} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
                  </label>
                  <label className="block text-sm font-medium">
                    Address
                    <input name="address" defaultValue={store.address ?? ""} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
                  </label>
                  <label className="block text-sm font-medium">
                    Phone
                    <input name="phone" defaultValue={store.phone ?? ""} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
                  </label>
                  <p className="text-xs text-stone-500">
                    {store._count.farmers} {store._count.farmers === 1 ? "customer uses" : "customers use"} this as their default store.
                  </p>
                  <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Save store</button>
                </ActionForm>
                {canDeleteRecords(session.role) ? (
                  <div className="mt-3">
                    <DeleteButton
                      action={deleteStoreAction}
                      name="storeId"
                      value={store.id}
                      label="Delete"
                      confirmText={`Delete store ${store.name}? Customers using it will have no default store.`}
                    />
                  </div>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </div>
      <div className="lg:col-span-2">
        <h2 className="font-display text-xl">Add store</h2>
        {allowStore ? (
          <ActionForm action={createStoreAction} className="mt-3 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
            <label className="block text-sm font-medium">
              Name
              <input name="name" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" placeholder="York shop" />
            </label>
            <label className="block text-sm font-medium">
              Address
              <input name="address" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
            </label>
            <label className="block text-sm font-medium">
              Phone
              <input name="phone" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
            </label>
            <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Save store</button>
          </ActionForm>
        ) : (
          <div className="mt-3">
            <ContactSalesNote>{contactSalesStoreMessage(plan?.org)}</ContactSalesNote>
          </div>
        )}
      </div>
    </div>
  );
}
