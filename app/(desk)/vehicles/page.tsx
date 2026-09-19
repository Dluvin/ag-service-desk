import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES, canAddTechnicians, isAdmin } from "@/lib/roles";
import { syncRevealVehiclesAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { loadRevealCreds } from "@/lib/reveal";

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ synced?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAddTechnicians(session.role)) redirect("/dashboard");
  const query = await searchParams;

  const [vehicles, technicians, configured] = await Promise.all([
    prisma.revealVehicle.findMany({
      where: { organizationId: session.organizationId },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
    prisma.user.findMany({
      where: { organizationId: session.organizationId, role: ROLES.TECHNICIAN, revealVehicleNumber: { not: null } },
      select: { name: true, revealVehicleNumber: true },
    }),
    loadRevealCreds(session.organizationId).then(Boolean),
  ]);

  const techByVehicle = new Map(
    technicians
      .filter((tech) => tech.revealVehicleNumber)
      .map((tech) => [tech.revealVehicleNumber as string, tech.name]),
  );

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl">Verizon vehicles</h1>
      <p className="mt-2 text-stone-600">
        These trucks come from Reveal. Assign one to each technician so Dispatch GPS and on-site
        time match the right person.{" "}
        <Link href="/reveal" className="text-emerald-800 hover:underline">
          Reveal GPS login
        </Link>
      </p>

      {query.synced ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
          Synced {query.synced} vehicle{query.synced === "1" ? "" : "s"} from Verizon.
        </p>
      ) : null}

      {isAdmin(session.role) ? (
        <ActionForm action={syncRevealVehiclesAction} className="mt-6">
          <button
            disabled={!configured}
            className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Refresh from Verizon
          </button>
          {!configured ? (
            <p className="mt-2 text-sm text-stone-600">Save Reveal GPS credentials first.</p>
          ) : null}
        </ActionForm>
      ) : null}

      <ul className="mt-6 divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200 bg-white">
        {vehicles.length === 0 ? (
          <li className="px-4 py-3 text-sm text-stone-600">
            No vehicles saved yet. {isAdmin(session.role) ? "Refresh from Verizon after Reveal is connected." : "Ask an admin to refresh the Verizon list."}
          </li>
        ) : (
          vehicles.map((vehicle) => (
            <li key={vehicle.id} className={`px-4 py-3 text-sm ${vehicle.active ? "" : "text-stone-400"}`}>
              <p className="font-medium text-stone-900">
                {vehicle.name}
                {!vehicle.active ? <span className="ml-2 text-xs font-normal text-stone-500">Inactive</span> : null}
              </p>
              <p className="text-stone-600">
                {vehicle.number}
                {techByVehicle.get(vehicle.number) ? ` · ${techByVehicle.get(vehicle.number)}` : " · not assigned"}
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
