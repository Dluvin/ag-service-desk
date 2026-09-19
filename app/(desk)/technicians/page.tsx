import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES, canAddTechnicians, canDeleteRecords, canImportStaff, staffRolesAssignableBy } from "@/lib/roles";
import { createTechnicianAction, deleteStaffAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { DeleteButton } from "@/components/DeleteButton";
import { StaffImportForm } from "@/components/StaffImportForm";
import { StoreSelect } from "@/components/StoreSelect";
import { StaffEditForm } from "@/components/StaffEditForm";
import { WelcomeMailNotice } from "@/components/WelcomeMailNotice";
import { listRevealVehicles, loadRevealCreds } from "@/lib/reveal";

export default async function TechniciansPage({
  searchParams,
}: {
  searchParams: Promise<{ imported?: string; updated?: string; skipped?: string; welcome?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAddTechnicians(session.role)) redirect("/dashboard");
  const query = await searchParams;
  const canImport = canImportStaff(session.role);
  const canDelete = canDeleteRecords(session.role);
  const roleOptions = staffRolesAssignableBy(session.role);

  const technicians = await prisma.user.findMany({
    where: { organizationId: session.organizationId, role: ROLES.TECHNICIAN },
    include: { tickets: { where: { status: { notIn: ["COMPLETED", "CANCELLED"] } } }, store: true },
    orderBy: { name: "asc" },
  });
  const stores = await prisma.store.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  let vehicles: { number: string; name: string }[] = [];
  if (await loadRevealCreds(session.organizationId)) {
    try {
      vehicles = await listRevealVehicles(session.organizationId);
    } catch {
      vehicles = [];
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <h1 className="font-display text-3xl">Technicians</h1>
        <WelcomeMailNotice status={query.welcome} />
        {query.imported || query.updated || query.skipped ? (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
            Import finished: {query.imported ?? "0"} added, {query.updated ?? "0"} updated
            {query.skipped && query.skipped !== "0" ? `, ${query.skipped} skipped` : ""}.
          </p>
        ) : null}
        <ul className="mt-6 divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200 bg-white">
          {technicians.map((tech) => (
            <li key={tech.id} className="px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="font-semibold">{tech.name}</p>
                {canDelete ? (
                  <DeleteButton
                    action={deleteStaffAction}
                    name="userId"
                    value={tech.id}
                    label="Delete"
                    confirmText={`Delete technician ${tech.name}? Assigned tickets will become unassigned.`}
                  />
                ) : null}
              </div>
              <p className="text-sm text-stone-600">
                {tech.email}
                {tech.phone ? ` · ${tech.phone}` : " · no SMS phone"}
                {tech.store ? ` · ${tech.store.name}` : ""}
                {` · ${tech.tickets.length} active ticket(s)`}
              </p>
              <StaffEditForm
                person={tech}
                stores={stores}
                next="/technicians"
                roleOptions={roleOptions}
                vehicles={vehicles}
              />
            </li>
          ))}
        </ul>
      </div>
      <div className="lg:col-span-2">
        <h2 className="font-display text-xl">Add technician</h2>
        <ActionForm action={createTechnicianAction} className="mt-3 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
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
            <input name="password" type="password" minLength={8} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
            <span className="mt-1 block text-xs font-normal text-stone-500">
              Optional. Leave blank to let them choose one from the welcome email.
            </span>
          </label>
          <label className="block text-sm font-medium">
            Mobile for SMS
            <input name="phone" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" placeholder="Optional" />
          </label>
          <label className="block text-sm font-medium">
            Reveal vehicle number
            <input name="revealVehicleNumber" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" placeholder="Optional" />
          </label>
          <StoreSelect stores={stores} label="Default store" />
          <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Save technician</button>
        </ActionForm>

        {canImport ? (
          <div className="mt-8">
            <StaffImportForm />
          </div>
        ) : null}
      </div>
    </div>
  );
}
