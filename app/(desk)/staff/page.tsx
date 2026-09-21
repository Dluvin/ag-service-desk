import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES, canDeleteRecords, canEditStaffMember, canImportStaff, canManageShopStaff, staffRolesAssignableBy } from "@/lib/roles";
import { roleLabel } from "@/lib/scope";
import { createStaffAction, deleteStaffAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { DeleteButton } from "@/components/DeleteButton";
import { StaffImportForm } from "@/components/StaffImportForm";
import { StoreSelect } from "@/components/StoreSelect";
import { StaffEditForm } from "@/components/StaffEditForm";
import { WelcomeMailNotice } from "@/components/WelcomeMailNotice";
import { VehicleSelect } from "@/components/VehicleSelect";
import { storedRevealVehicles } from "@/lib/reveal";
import { PLAN, extraStaffSeats } from "@/lib/plan";

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ imported?: string; updated?: string; skipped?: string; welcome?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageShopStaff(session.role)) redirect("/dashboard");
  const query = await searchParams;
  const roleOptions = staffRolesAssignableBy(session.role);
  const canImport = canImportStaff(session.role);

  const [staff, stores, vehicles, seatCount] = await Promise.all([
    prisma.user.findMany({
      where: {
        organizationId: session.organizationId,
        role: { in: roleOptions },
      },
      include: { store: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    prisma.store.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    storedRevealVehicles(session.organizationId),
    prisma.user.count({
      where: {
        organizationId: session.organizationId,
        role: { in: [ROLES.ADMIN, ROLES.MANAGER, ROLES.TECHNICIAN] },
      },
    }),
  ]);
  const includedSeats = PLAN.includedSeats;
  const extraSeats = extraStaffSeats(seatCount);

  const groups = [
    { role: ROLES.ADMIN, title: "Admins" },
    { role: ROLES.MANAGER, title: "Managers" },
    { role: ROLES.TECHNICIAN, title: "Technicians" },
  ].filter((group) => canEditStaffMember(session.role, group.role));

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <h1 className="font-display text-3xl">Staff</h1>
        <p className="mt-1 text-sm text-stone-600">
          {session.role === ROLES.ADMIN
            ? "Add and edit company admins, managers, and technicians. Assign a default store so new work orders they open start at that shop."
            : "Add and edit managers and technicians. Assign a default store so new work orders they open start at that shop."}{" "}
          Customer logins stay on the Customers page.
        </p>
        <WelcomeMailNotice status={query.welcome} />
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
                    <li key={person.id} className="px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{person.name}</p>
                          <p className="text-sm text-stone-600">
                            {person.email}
                            {person.phone ? ` · ${person.phone}` : ""}
                            {` · ${roleLabel(person.role)}`}
                            {person.store ? ` · ${person.store.name}` : ""}
                          </p>
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
                      </div>
                      <StaffEditForm person={person} stores={stores} next="/staff" roleOptions={roleOptions} vehicles={vehicles} />
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
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Password
            <input name="password" type="password" minLength={8} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
            <span className="mt-1 block text-xs font-normal text-stone-500">
              Optional. Leave blank to let them choose one from the welcome email. If you set one, the
              email will ask them to change it.
            </span>
          </label>
          <label className="block text-sm font-medium">
            Mobile for SMS
            <input name="phone" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" placeholder="Optional" />
          </label>
          <StoreSelect stores={stores} label="Default store" />
          <VehicleSelect vehicles={vehicles} />
          <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Save staff</button>
        </ActionForm>

        <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="font-display text-lg text-stone-900">Increase staff seats</h2>
          <p className="mt-2 text-sm text-stone-700">
            This company plan includes <span className="font-semibold">{PLAN.includedSeats} staff logins</span> for{" "}
            <span className="font-semibold">${PLAN.monthlyDollars}/month</span> (admins, managers, and technicians).
            Customer logins are separate. Extra staff seats are <span className="font-semibold">${PLAN.extraSeatDollars}/month</span>{" "}
            each. New companies get a {PLAN.trialDays}-day trial after approval.
          </p>
          <p className="mt-2 text-sm text-stone-700">
            {seatCount} of {includedSeats} included seats in use
            {extraSeats > 0 ? ` · ${extraSeats} extra seat${extraSeats === 1 ? "" : "s"} at $${PLAN.extraSeatDollars}/month` : ""}.
          </p>
          <Link
            href="/contact"
            className="mt-3 inline-block text-sm font-semibold text-emerald-800 hover:underline"
          >
            Request more seats
          </Link>
        </section>

        {canImport ? (
          <div className="mt-8">
            <StaffImportForm />
          </div>
        ) : null}
      </div>
    </div>
  );
}
