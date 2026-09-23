import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pivotWhere, ticketWhere } from "@/lib/scope";
import { ROLES } from "@/lib/roles";
import { homePath } from "@/lib/home";
import { StatusBadge } from "@/components/Badges";
import { redirect } from "next/navigation";
import { STARTUP_SEASON_YEAR } from "@/lib/startup";
import { AllTicketsMap } from "@/components/AllTicketsMap";
import { OPEN_TICKET_STATUSES, ticketPins } from "@/lib/map-pins";
import { parseStoreParam, storeFarmerWhere, storePivotWhere, storeQuery, storeTicketWhere, ticketStoreName } from "@/lib/stores";
import { StoreFilter } from "@/components/StoreFilter";
import { ActionForm } from "@/components/ActionForm";
import { StoreSelect } from "@/components/StoreSelect";
import { updateFarmerStoreAction } from "@/lib/actions";
import { printSelectHref } from "@/lib/ticket-print";
import { loadOrgPlan } from "@/lib/org-plan";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== ROLES.FARMER) redirect(homePath(session.role));

  const query = await searchParams;
  const plan = await loadOrgPlan(session.organizationId);
  const showMaps = plan?.entitlements.mapsEnabled ?? true;
  const stores = await prisma.store.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const selectedStore = parseStoreParam(query.store, stores);
  const storeTickets = session.role === ROLES.FARMER ? {} : storeTicketWhere(selectedStore);
  const storePivots = session.role === ROLES.FARMER ? {} : storePivotWhere(selectedStore);
  const storeFarms = session.role === ROLES.FARMER ? {} : storeFarmerWhere(selectedStore);

  const farmer =
    session.role === ROLES.FARMER && session.farmerId
      ? await prisma.farmer.findFirst({
          where: { id: session.farmerId, organizationId: session.organizationId },
          select: { id: true, storeId: true, store: { select: { name: true } } },
        })
      : null;

  const [openTickets, pivots, farmers, techs, repairDoneCount] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        ...ticketWhere(session),
        ...storeTickets,
        status: { in: [...OPEN_TICKET_STATUSES] },
      },
      include: { farmer: { include: { store: true } }, pivot: true, technician: true, store: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.pivot.count({ where: { ...pivotWhere(session), ...storePivots } }),
    session.role === ROLES.ADMIN || session.role === ROLES.MANAGER
      ? prisma.farmer.count({ where: { organizationId: session.organizationId, ...storeFarms } })
      : Promise.resolve(null),
    session.role === ROLES.ADMIN || session.role === ROLES.MANAGER
      ? prisma.user.count({ where: { organizationId: session.organizationId, role: ROLES.TECHNICIAN } })
      : Promise.resolve(null),
    prisma.ticket.count({
      where: {
        ...ticketWhere(session),
        ...storeTickets,
        status: "REPAIR_DONE",
      },
    }),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl">Dashboard</h1>
      <p className="mt-1 text-stone-600">
        {session.role === ROLES.FARMER
          ? "Open a work order or add information on an existing call."
          : session.role === ROLES.TECHNICIAN
            ? "Work orders assigned to you."
            : "Dispatch across your company. Filter by store to see one shop at a time."}
      </p>
      {session.role !== ROLES.FARMER ? (
        <StoreFilter stores={stores} selected={selectedStore} pathname="/dashboard" />
      ) : farmer ? (
        <ActionForm action={updateFarmerStoreAction} className="mt-4 max-w-md space-y-3 rounded-xl border border-stone-200 bg-white p-4">
          <input type="hidden" name="farmerId" value={farmer.id} />
          <p className="text-sm text-stone-600">
            {farmer.store ? `Your default store is ${farmer.store.name}.` : "No default store yet."} Dispatch uses this so the right shop sees your calls.
          </p>
          <StoreSelect stores={stores} defaultValue={farmer.storeId} />
          <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Save default store</button>
        </ActionForm>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Active work orders" value={String(openTickets.length)} />
        <Stat label="Pivots" value={String(pivots)} />
        <Stat
          label={session.role === ROLES.ADMIN || session.role === ROLES.MANAGER ? "Customers / techs" : "Your role"}
          value={
            session.role === ROLES.ADMIN || session.role === ROLES.MANAGER
              ? `${farmers} / ${techs}`
              : session.role === ROLES.TECHNICIAN
                ? "Technician"
                : "Customer portal"
          }
        />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {session.role !== ROLES.FARMER ? (
          <Link href={`/dispatch${storeQuery(selectedStore)}`} className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
            Dispatch board
          </Link>
        ) : null}
        <Link
          href="/tickets/new"
          className={
            session.role === ROLES.FARMER
              ? "rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white"
              : "rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold"
          }
        >
          {session.role === ROLES.FARMER ? "Request service" : "New work order"}
        </Link>
        <Link href="/startup" className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold">
          {STARTUP_SEASON_YEAR} maintenance
        </Link>
        {showMaps ? (
          <Link href={`/map${storeQuery(selectedStore)}`} className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold">
            Open work orders map
          </Link>
        ) : null}
        <Link
          href={printSelectHref({
            status: "REPAIR_DONE",
            store: session.role === ROLES.FARMER ? undefined : selectedStore,
          })}
          className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold"
        >
          Print repair done{repairDoneCount > 0 ? ` (${repairDoneCount})` : ""}
        </Link>
        {session.role !== ROLES.FARMER ? (
          <Link href="/pivots/new" className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold">
            Add pivot
          </Link>
        ) : null}
      </div>

      <h2 className="font-display mt-10 text-xl">Open work orders map</h2>
      <p className="mt-1 text-sm text-stone-600">Every active call at the pivot location.</p>
      <div className="mt-4">
        <AllTicketsMap pins={ticketPins(openTickets)} store={session.role === ROLES.FARMER ? undefined : selectedStore} />
      </div>

      <h2 className="font-display mt-10 text-xl">Recent work orders</h2>
      <div className="mt-3 overflow-hidden rounded-xl border border-stone-200 bg-white">
        {openTickets.length === 0 ? (
          <p className="p-4 text-sm text-stone-600">No active work orders.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {openTickets.slice(0, 8).map((ticket) => (
              <li key={ticket.id}>
                <Link href={`/tickets/${ticket.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-stone-50">
                  <div>
                    <p className="font-medium">#{ticket.number} {ticket.title}</p>
                    <p className="text-sm text-stone-600">
                      {ticket.farmer.name}
                      {ticketStoreName(ticket) ? ` · ${ticketStoreName(ticket)}` : ""} · {ticket.pivot.name}
                      {ticket.technician ? ` · ${ticket.technician.name}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={ticket.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
