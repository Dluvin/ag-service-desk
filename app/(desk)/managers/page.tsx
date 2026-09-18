import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES, canDeleteRecords, isAdmin } from "@/lib/roles";
import { createManagerAction, deleteStaffAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { DeleteButton } from "@/components/DeleteButton";
import { StaffImportForm } from "@/components/StaffImportForm";
import { StoreSelect } from "@/components/StoreSelect";
import { StaffStoreForm } from "@/components/StaffStoreForm";

export default async function ManagersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isAdmin(session.role)) redirect("/dashboard");

  const [managers, stores] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId: session.organizationId, role: ROLES.MANAGER },
      include: { store: true },
      orderBy: { name: "asc" },
    }),
    prisma.store.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <h1 className="font-display text-3xl">Managers</h1>
        <p className="mt-1 text-sm text-stone-600">
          Managers can assign and edit tickets, add farms, and add technicians. Only admins can
          delete records or import pivots and staff.
        </p>
        <ul className="mt-6 divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200 bg-white">
          {managers.length === 0 ? (
            <li className="px-4 py-3 text-sm text-stone-600">No managers yet.</li>
          ) : (
            managers.map((manager) => (
              <li key={manager.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-semibold">{manager.name}</p>
                  <p className="text-sm text-stone-600">
                    {manager.email}
                    {manager.phone ? ` · ${manager.phone}` : " · no SMS phone"}
                    {manager.store ? ` · ${manager.store.name}` : ""}
                  </p>
                  <StaffStoreForm userId={manager.id} stores={stores} defaultValue={manager.storeId} next="/managers" />
                </div>
                {canDeleteRecords(session.role) ? (
                  <DeleteButton
                    action={deleteStaffAction}
                    name="userId"
                    value={manager.id}
                    label="Delete"
                    confirmText={`Delete manager ${manager.name}? Their login will stop working.`}
                  />
                ) : null}
              </li>
            ))
          )}
        </ul>
      </div>
      <div className="lg:col-span-2">
        <h2 className="font-display text-xl">Add manager</h2>
        <ActionForm action={createManagerAction} className="mt-3 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
          <label className="block text-sm font-medium">
            Name
            <input name="name" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            Email
            <input name="email" type="email" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input name="password" type="password" minLength={8} required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            Mobile for SMS
            <input name="phone" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" placeholder="Optional" />
          </label>
          <StoreSelect stores={stores} label="Default store" />
          <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Save manager</button>
        </ActionForm>
        <div className="mt-8">
          <StaffImportForm />
        </div>
      </div>
    </div>
  );
}
