import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pivotWhere, ticketWhere } from "@/lib/scope";
import { ROLES } from "@/lib/roles";
import { SelectableMap } from "@/components/SelectableMap";
import { AllTicketsMap } from "@/components/AllTicketsMap";
import { StoreFilter } from "@/components/StoreFilter";
import { OPEN_TICKET_STATUSES, ticketPins } from "@/lib/map-pins";
import { parseStoreParam, storePivotWhere, storeTicketWhere } from "@/lib/stores";

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const query = await searchParams;
  const stores = await prisma.store.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const selectedStore = parseStoreParam(query.store, stores);
  const storeTickets = session.role === ROLES.FARMER ? {} : storeTicketWhere(selectedStore);
  const storePivots = session.role === ROLES.FARMER ? {} : storePivotWhere(selectedStore);

  const [tickets, pivots] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        ...ticketWhere(session),
        ...storeTickets,
        status: { in: [...OPEN_TICKET_STATUSES] },
      },
      include: { farmer: true, pivot: true, technician: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.pivot.findMany({
      where: { ...pivotWhere(session), ...storePivots },
      include: { farmer: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl">Maps</h1>
      <p className="mt-1 text-stone-600">
        Every open work order at its pivot, then the full pivot fleet. Filter by store to see one shop’s work orders, pivots, and trucks.
      </p>
      {session.role !== ROLES.FARMER ? (
        <StoreFilter stores={stores} selected={selectedStore} pathname="/map" />
      ) : null}

      <h2 className="font-display mt-8 text-xl">Open work orders</h2>
      <p className="mt-1 text-sm text-stone-600">Pins for open, assigned, in-progress, and waiting-on-parts work.</p>
      <div className="mt-4">
        <AllTicketsMap pins={ticketPins(tickets)} store={session.role === ROLES.FARMER ? undefined : selectedStore} />
      </div>

      <h2 className="font-display mt-10 text-xl">All pivots</h2>
      <p className="mt-1 text-sm text-stone-600">Google Maps location for every pivot in your view.</p>
      <div className="mt-4">
        <SelectableMap
          store={session.role === ROLES.FARMER ? undefined : selectedStore}
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
