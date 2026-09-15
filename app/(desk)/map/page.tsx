import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pivotWhere, ticketWhere } from "@/lib/scope";
import { SelectableMap } from "@/components/SelectableMap";
import { AllTicketsMap } from "@/components/AllTicketsMap";
import { OPEN_TICKET_STATUSES, ticketPins } from "@/lib/map-pins";

export default async function MapPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [tickets, pivots] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        ...ticketWhere(session),
        status: { in: [...OPEN_TICKET_STATUSES] },
      },
      include: { farmer: true, pivot: true, technician: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.pivot.findMany({
      where: pivotWhere(session),
      include: { farmer: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl">Maps</h1>
      <p className="mt-1 text-stone-600">Every open ticket at its pivot, then the full pivot fleet.</p>

      <h2 className="font-display mt-8 text-xl">Open tickets</h2>
      <p className="mt-1 text-sm text-stone-600">Pins for open, assigned, in-progress, and waiting-on-parts work.</p>
      <div className="mt-4">
        <AllTicketsMap pins={ticketPins(tickets)} />
      </div>

      <h2 className="font-display mt-10 text-xl">All pivots</h2>
      <p className="mt-1 text-sm text-stone-600">Google Maps location for every pivot in your view.</p>
      <div className="mt-4">
        <SelectableMap
          markers={pivots.map((pivot) => ({
            id: pivot.id,
            name: pivot.name,
            lat: pivot.latitude,
            lng: pivot.longitude,
            subtitle: pivot.farmer.name,
          }))}
        />
      </div>
    </div>
  );
}
