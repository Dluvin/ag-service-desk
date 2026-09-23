import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadTechnicians, ticketWhere } from "@/lib/scope";
import {
  DISPATCH_STATUSES,
  ROLES,
  TICKET_STATUSES,
  STATUS_LABELS,
  canAssignTickets,
  isFinishedStatus,
  type TicketStatus,
} from "@/lib/roles";
import { assignTicketAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { DispatchFleetMap } from "@/components/DispatchFleetMap";
import { ticketPins } from "@/lib/map-pins";
import { parseStoreParam, storeTicketWhere, ticketStoreName } from "@/lib/stores";
import { StoreFilter } from "@/components/StoreFilter";
import { DispatchCalendarToggle } from "@/components/DispatchCalendarToggle";
import { DispatchWorkOrderCard } from "@/components/DispatchWorkOrderCard";
import { DispatchStatusFilters } from "@/components/DispatchStatusFilters";
import { dispatchFilterExtra, filterDispatchTickets, parseDispatchListQuery } from "@/lib/dispatch-list";
import { formatSchedule } from "@/lib/schedule";

export default async function DispatchPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string; month?: string; status?: string | string[]; closed?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === ROLES.FARMER) redirect("/dashboard");

  const query = await searchParams;
  const stores = await prisma.store.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const selectedStore = parseStoreParam(query.store, stores);
  const filters = parseDispatchListQuery(query);

  const [tickets, technicians] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        ...ticketWhere(session),
        ...storeTicketWhere(selectedStore),
      },
      include: { farmer: { include: { store: true } }, pivot: true, technician: true, store: true },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    }),
    loadTechnicians(session.organizationId),
  ]);

  const listTickets = filterDispatchTickets(tickets, filters);
  const openTickets = tickets.filter((ticket) => DISPATCH_STATUSES.includes(ticket.status as TicketStatus));
  const statusCounts = Object.fromEntries(
    TICKET_STATUSES.map((status) => [status, tickets.filter((ticket) => ticket.status === status).length]),
  ) as Partial<Record<TicketStatus, number>>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Dispatch board</h1>
        <Link href="/tickets/new" className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
          Create work order
        </Link>
      </div>
      <p className="mt-1 text-stone-600">
        All work orders in one list. Filter by status, hide completed, assign a technician, and see
        open work on the map. Filter by store to work one shop at a time.
      </p>
      <StoreFilter
        stores={stores}
        selected={selectedStore}
        pathname="/dispatch"
        extra={dispatchFilterExtra({ ...filters, month: query.month })}
      />
      <DispatchStatusFilters
        statuses={filters.statuses}
        hideCompleted={filters.hideCompleted}
        store={selectedStore}
        month={query.month}
        counts={statusCounts}
      />
      <p className="mt-3 text-sm text-stone-500">{summaryText(listTickets.length, filters.statuses, filters.hideCompleted)}</p>

      <ul className="mt-4 space-y-2">
        {listTickets.length === 0 ? (
          <li className="rounded-xl border border-stone-200 bg-white px-4 py-6 text-stone-600">
            {emptyText(filters.statuses, filters.hideCompleted)}
          </li>
        ) : (
          listTickets.map((ticket) => (
            <DispatchWorkOrderCard
              key={ticket.id}
              href={`/tickets/${ticket.id}`}
              number={ticket.number}
              title={ticket.title}
              customer={ticket.farmer.name}
              priority={ticket.priority}
              status={ticket.status}
            >
              <p className="mt-1 text-xs text-stone-600">
                {[ticketStoreName(ticket), ticket.pivot?.name].filter(Boolean).join(" · ") || "No store or pivot"}
              </p>
              {ticket.scheduledAt ? (
                <p className="mt-1 text-xs font-medium text-emerald-900">{formatSchedule(ticket.scheduledAt)}</p>
              ) : null}
              <ActionForm action={assignTicketAction} className="mt-2 space-y-2">
                <input type="hidden" name="ticketId" value={ticket.id} />
                {canAssignTickets(session.role) ? (
                  <select
                    name="technicianId"
                    defaultValue={ticket.technicianId ?? ""}
                    className="w-full rounded-md border border-stone-300 px-2 py-1 text-xs"
                  >
                    <option value="">Unassigned</option>
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input type="hidden" name="technicianId" value={ticket.technicianId ?? ""} />
                )}
                <select
                  name="status"
                  defaultValue={ticket.status}
                  className="w-full rounded-md border border-stone-300 px-2 py-1 text-xs"
                >
                  {TICKET_STATUSES.filter((status) => !isFinishedStatus(status) || ticket.status === status).map(
                    (status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </option>
                    ),
                  )}
                </select>
                <button className="w-full rounded-md bg-emerald-800 px-2 py-1 text-xs font-semibold text-white">
                  Update
                </button>
              </ActionForm>
            </DispatchWorkOrderCard>
          ))
        )}
      </ul>

      <DispatchCalendarToggle tickets={openTickets} month={query.month} store={selectedStore} />

      <h2 className="font-display mt-10 text-xl">Open work orders map</h2>
      <p className="mt-1 text-sm text-stone-600">
        Green pins are work orders at the pivot. Amber pins are Verizon Connect Reveal trucks. Click a
        pin for the work order or Google Maps.
      </p>
      <div className="mt-4">
        <DispatchFleetMap ticketPins={ticketPins(openTickets)} canConfigure={session.role === ROLES.ADMIN} store={selectedStore} />
      </div>
    </div>
  );
}

function summaryText(count: number, statuses: TicketStatus[], hideCompleted: boolean) {
  const noun = count === 1 ? "work order" : "work orders";
  if (count === 0) return emptyText(statuses, hideCompleted);
  if (statuses.length === 1) return `${count} ${STATUS_LABELS[statuses[0]]} ${noun}.`;
  if (statuses.length > 1) return `${count} ${noun} in ${statuses.length} statuses.`;
  if (hideCompleted) return `${count} open ${noun}.`;
  return `${count} ${noun}.`;
}

function emptyText(statuses: TicketStatus[], hideCompleted: boolean) {
  if (statuses.length === 1) return `No ${STATUS_LABELS[statuses[0]]} work orders.`;
  if (statuses.length > 1) return "No work orders match these statuses.";
  if (hideCompleted) return "No open work orders to show.";
  return "No work orders to show.";
}
