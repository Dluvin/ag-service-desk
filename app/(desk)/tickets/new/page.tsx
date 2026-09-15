import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pivotWhere, loadTechnicians } from "@/lib/scope";
import { ROLES, PRIORITIES } from "@/lib/roles";
import { createTicketAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { NewTicketSiteFields } from "@/components/NewTicketSiteFields";

export default async function NewTicketPage({
  searchParams,
}: {
  searchParams: Promise<{ pivotId?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const query = await searchParams;

  const [pivots, technicians, farmers] = await Promise.all([
    prisma.pivot.findMany({
      where: pivotWhere(session),
      include: { farmer: true },
      orderBy: { name: "asc" },
    }),
    loadTechnicians(session.organizationId),
    session.role === ROLES.FARMER
      ? Promise.resolve([])
      : prisma.farmer.findMany({
          where: { organizationId: session.organizationId },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        }),
  ]);

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl">
        {session.role === ROLES.FARMER ? "Request service" : "New service ticket"}
      </h1>
      <p className="mt-1 text-sm text-stone-600">
        {session.role === ROLES.FARMER
          ? "Pick one of your pivots or add a new location, then describe the problem. The shop will get the ticket."
          : "Use an existing pivot, or add a new pivot (and a new farm if needed) and drop a pin on Google Maps."}
      </p>
      <ActionForm action={createTicketAction} className="mt-6 space-y-4 rounded-xl border border-stone-200 bg-white p-6">
        <NewTicketSiteFields
          pivots={pivots.map((pivot) => ({
            id: pivot.id,
            name: pivot.name,
            farmerName: pivot.farmer.name,
            farmerId: pivot.farmerId,
          }))}
          farmers={farmers}
          canAddFarmer={session.role === ROLES.ADMIN || session.role === ROLES.TECHNICIAN}
          mapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || undefined}
          lockedFarmerId={session.role === ROLES.FARMER ? session.farmerId : null}
          defaultPivotId={query.pivotId}
        />
        <label className="block text-sm font-medium">
          Title
          <input name="title" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
        </label>
        <label className="block text-sm font-medium">
          Description
          <textarea name="description" required rows={4} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
        </label>
        <label className="block text-sm font-medium">
          Priority
          <select name="priority" defaultValue="NORMAL" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2">
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        {session.role === ROLES.ADMIN ? (
          <label className="block text-sm font-medium">
            Assign technician
            <select name="technicianId" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2">
              <option value="">Unassigned</option>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button className="rounded-lg bg-emerald-800 px-4 py-2 font-semibold text-white">
          {session.role === ROLES.FARMER ? "Send to the shop" : "Create ticket"}
        </button>
      </ActionForm>
    </div>
  );
}
