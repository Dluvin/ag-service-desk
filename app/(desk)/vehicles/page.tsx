import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES, canAddTechnicians, isAdmin } from "@/lib/roles";
import { syncRevealVehiclesAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { fetchRevealLocationReport, loadRevealCreds, type RevealLocation } from "@/lib/reveal";

function formatLocationTime(value?: string) {
  if (!value) return "";
  const date = new Date(value.endsWith("Z") || value.includes("+") ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

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

  let locationsByNumber = new Map<string, RevealLocation>();
  let locationError: string | null = null;
  let gpsFound = 0;
  const missingVehicleNumber = new Set<string>();
  if (configured && vehicles.length > 0) {
    try {
      const report = await fetchRevealLocationReport(
        session.organizationId,
        vehicles.map((vehicle) => vehicle.number),
      );
      gpsFound = report.locations.length;
      locationsByNumber = new Map(
        report.locations.map((location) => [location.vehicleNumber.trim().toLowerCase(), location]),
      );
      report.withoutVehicleNumber.forEach((name) => missingVehicleNumber.add(name.trim().toLowerCase()));
      if (report.errors.length > 0) {
        locationError = report.errors.join(" ");
      }
    } catch (error) {
      locationError = error instanceof Error ? error.message : "Could not load current locations.";
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl">Verizon vehicles</h1>
      <p className="mt-2 text-stone-600">
        These trucks come from Reveal. Vehicle Update GPS needs a Vehicle # in Verizon. If that
        field is blank, fill it in Reveal, then Refresh from Verizon. Assign a numbered truck to
        each technician so Dispatch pins match.{" "}
        <Link href="/reveal" className="text-emerald-800 hover:underline">
          Reveal GPS login
        </Link>
      </p>

      {query.synced ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
          Synced {query.synced} vehicle{query.synced === "1" ? "" : "s"} from Verizon.
        </p>
      ) : null}
      {locationError ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {locationError}
        </p>
      ) : null}

      {configured && vehicles.length > 0 ? (
        <p className="mt-3 text-sm text-stone-600">
          GPS loaded for {gpsFound} of {vehicles.length} trucks.
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
          vehicles.map((vehicle) => {
            const location = locationsByNumber.get(vehicle.number.trim().toLowerCase());
            const when = formatLocationTime(location?.updatedAt);
            return (
              <li key={vehicle.id} className={`px-4 py-3 text-sm ${vehicle.active ? "" : "text-stone-400"}`}>
                <p className="font-medium text-stone-900">
                  {vehicle.name}
                  {!vehicle.active ? <span className="ml-2 text-xs font-normal text-stone-500">Inactive</span> : null}
                </p>
                <p className="text-stone-600">
                  {vehicle.number}
                  {techByVehicle.get(vehicle.number) ? ` · ${techByVehicle.get(vehicle.number)}` : " · not assigned"}
                  {location?.displayState ? ` · ${location.displayState}` : ""}
                </p>
                {location ? (
                  <p className="mt-1 text-stone-600">
                    {location.address || `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`}
                    {when ? ` · ${when}` : ""}
                    {" · "}
                    <a
                      href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-800 hover:underline"
                    >
                      Map
                    </a>
                  </p>
                ) : configured &&
                  (missingVehicleNumber.has(vehicle.name.trim().toLowerCase()) ||
                    missingVehicleNumber.has(vehicle.number.trim().toLowerCase())) ? (
                  <p className="mt-1 text-xs text-stone-500">
                    No Vehicle # in Reveal. Add one, then Refresh from Verizon.
                  </p>
                ) : configured ? (
                  <p className="mt-1 text-xs text-stone-500">No current location from Verizon.</p>
                ) : null}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
