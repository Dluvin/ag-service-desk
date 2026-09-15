import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES, canAddTechnicians, canDeleteRecords, canImportStaff } from "@/lib/roles";
import { createTechnicianAction, deleteStaffAction, updateTechnicianVehicleAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { DeleteButton } from "@/components/DeleteButton";
import { StaffImportForm } from "@/components/StaffImportForm";
import { listRevealVehicles, loadRevealCreds } from "@/lib/reveal";

export default async function TechniciansPage({
  searchParams,
}: {
  searchParams: Promise<{ imported?: string; updated?: string; skipped?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAddTechnicians(session.role)) redirect("/dashboard");
  const query = await searchParams;
  const canImport = canImportStaff(session.role);
  const canDelete = canDeleteRecords(session.role);

  const technicians = await prisma.user.findMany({
    where: { organizationId: session.organizationId, role: ROLES.TECHNICIAN },
    include: { tickets: { where: { status: { notIn: ["COMPLETED", "CANCELLED"] } } } },
    orderBy: { name: "asc" },
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
                {` · ${tech.tickets.length} active ticket(s)`}
              </p>
              <ActionForm action={updateTechnicianVehicleAction} className="mt-2 flex flex-wrap items-end gap-2">
                <input type="hidden" name="technicianId" value={tech.id} />
                <label className="block min-w-40 flex-1 text-xs font-medium">
                  Mobile for SMS
                  <input
                    name="phone"
                    defaultValue={tech.phone ?? ""}
                    placeholder="402-555-0100"
                    className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1 text-sm"
                  />
                </label>
                <label className="block min-w-56 flex-1 text-xs font-medium">
                  Reveal vehicle
                  {vehicles.length > 0 ? (
                    <select
                      name="revealVehicleNumber"
                      defaultValue={tech.revealVehicleNumber ?? ""}
                      className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1 text-sm"
                    >
                      <option value="">Not mapped</option>
                      {vehicles.map((vehicle) => (
                        <option key={vehicle.number} value={vehicle.number}>
                          {vehicle.name} ({vehicle.number})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      name="revealVehicleNumber"
                      defaultValue={tech.revealVehicleNumber ?? ""}
                      placeholder="Vehicle number"
                      className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1 text-sm"
                    />
                  )}
                </label>
                <button className="rounded-md bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white">
                  Save
                </button>
              </ActionForm>
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
            <input name="password" type="password" minLength={8} required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            Mobile for SMS
            <input name="phone" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" placeholder="Optional" />
          </label>
          <label className="block text-sm font-medium">
            Reveal vehicle number
            <input name="revealVehicleNumber" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" placeholder="Optional" />
          </label>
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
