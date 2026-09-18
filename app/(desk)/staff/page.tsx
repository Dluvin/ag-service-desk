import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES, canDeleteRecords, isAdmin } from "@/lib/roles";
import { roleLabel } from "@/lib/scope";
import { createStaffAction, deleteStaffAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { DeleteButton } from "@/components/DeleteButton";
import { StaffImportForm } from "@/components/StaffImportForm";
import { StoreSelect } from "@/components/StoreSelect";
import { StaffStoreForm } from "@/components/StaffStoreForm";

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ imported?: string; updated?: string; skipped?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isAdmin(session.role)) redirect("/dashboard");
  const query = await searchParams;

  const [staff, stores] = await Promise.all([
    prisma.user.findMany({
      where: {
        organizationId: session.organizationId,
        role: { in: [ROLES.ADMIN, ROLES.MANAGER, ROLES.TECHNICIAN] },
      },
      include: { store: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    prisma.store.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const groups = [
    { role: ROLES.ADMIN, title: "Admins" },
    { role: ROLES.MANAGER, title: "Managers" },
    { role: ROLES.TECHNICIAN, title: "Technicians" },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <h1 className="font-display text-3xl">Staff</h1>
        <p className="mt-1 text-sm text-stone-600">
          Add company admins, managers, and technicians one at a time or from a CSV. Assign a default
          store so new tickets they open start at that shop. Farm logins stay on the Farms page.
        </p>
        {query.imported || query.updated || query.skipped ? (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
            Import finished: {query.imported ?? "0"} added, {query.updated ?? "0"} updated
            {query.skipped && query.skipped !== "0" ? `, ${query.skipped} skipped` : ""}.
          </p>
        ) : null}
        {groups.map((group) => {
          const people = staff.filter((person) => person.role === group.role);
          return (
            <section key={group.role} className="mt-8">
              <h2 className="font-display text-xl">{group.title}</h2>
              <ul className="mt-3 divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200 bg-white">
                {people.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-stone-600">None yet.</li>
                ) : (
                  people.map((person) => (
                    <li key={person.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                      <div>
                        <p className="font-semibold">{person.name}</p>
                        <p className="text-sm text-stone-600">
                          {person.email}
                          {person.phone ? ` · ${person.phone}` : ""}
                          {` · ${roleLabel(person.role)}`}
                          {person.store ? ` · ${person.store.name}` : ""}
                        </p>
                        <StaffStoreForm userId={person.id} stores={stores} defaultValue={person.storeId} next="/staff" />
                      </div>
                      {canDeleteRecords(session.role) && person.id !== session.userId ? (
                        <DeleteButton
                          action={deleteStaffAction}
                          name="userId"
                          value={person.id}
                          label="Delete"
                          confirmText={`Delete ${person.name}? Their login will stop working.`}
                        />
                      ) : null}
                    </li>
                  ))
                )}
              </ul>
            </section>
          );
        })}
        <p className="mt-6 text-sm text-stone-600">
          <Link href="/managers" className="text-emerald-800 hover:underline">
            Managers
          </Link>
          {" · "}
          <Link href="/technicians" className="text-emerald-800 hover:underline">
            Technicians
          </Link>
        </p>
      </div>
      <div className="lg:col-span-2">
        <h2 className="font-display text-xl">Add staff</h2>
        <ActionForm action={createStaffAction} className="mt-3 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
          <label className="block text-sm font-medium">
            Name
            <input name="name" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            Email
            <input name="email" type="email" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            Role
            <select name="role" defaultValue={ROLES.TECHNICIAN} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2">
              <option value={ROLES.ADMIN}>Admin</option>
              <option value={ROLES.MANAGER}>Manager</option>
              <option value={ROLES.TECHNICIAN}>Technician</option>
            </select>
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
          <label className="block text-sm font-medium">
            Reveal vehicle number
            <input name="revealVehicleNumber" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" placeholder="Technicians only" />
          </label>
          <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Save staff</button>
        </ActionForm>

        <div className="mt-8">
          <StaffImportForm />
        </div>
      </div>
    </div>
  );
}
