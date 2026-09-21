import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadTechnicians, ticketWhere } from "@/lib/scope";
import { DISPATCH_STATUSES, ROLES, TICKET_STATUSES, STATUS_LABELS, canAssignTickets, isFinishedStatus, type TicketStatus } from "@/lib/roles";
import { assignTicketAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { PriorityBadge } from "@/components/Badges";
import { DispatchFleetMap } from "@/components/DispatchFleetMap";
import { ticketPins } from "@/lib/map-pins";
import { parseStoreParam, storeTicketWhere, ticketStoreName } from "@/lib/stores";
import { StoreFilter } from "@/components/StoreFilter";
import { DispatchCalendarToggle } from "@/components/DispatchCalendarToggle";
import { formatSchedule } from "@/lib/schedule";

const COLUMNS: TicketStatus[] = [...DISPATCH_STATUSES];

export default async function DispatchPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string; month?: string }>;
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

  const [tickets, technicians] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        ...ticketWhere(session),
        ...storeTicketWhere(selectedStore),
        status: { in: COLUMNS },
      },
      include: { farmer: { include: { store: true } }, pivot: true, technician: true, store: true },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    }),
    loadTechnicians(session.organizationId),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Dispatch board</h1>
        <Link href="/tickets/new" className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
          Create work order
        </Link>
      </div>
      <p className="mt-1 text-stone-600">
        Open work by status, assign a technician, and see every open work order on the map. Filter by store to work one shop at a time.
      </p>
      <StoreFilter stores={stores} selected={selectedStore} pathname="/dispatch" />

      <div className="mt-6 grid gap-3 lg:grid-cols-5">
        {COLUMNS.map((column) => {
          const items = tickets.filter((ticket) => ticket.status === column);
          return (
            <section key={column} className="min-h-48 rounded-xl border border-stone-200 bg-stone-50/80 p-2">
              <div className="flex items-center justify-between px-2 py-1">
                <h2 className="text-sm font-semibold">{STATUS_LABELS[column]}</h2>
                <span className="text-xs text-stone-500">{items.length}</span>
              </div>
              <ul className="space-y-2">
                {items.map((ticket) => (
                  <li key={ticket.id} className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
                    <Link href={`/tickets/${ticket.id}`} className="font-medium text-emerald-950 hover:underline">
                      #{ticket.number} {ticket.title}
                    </Link>
                    <p className="mt-1 text-xs text-stone-600">
                      {ticket.farmer.name}
                      {ticketStoreName(ticket) ? ` · ${ticketStoreName(ticket)}` : ""} · {ticket.pivot.name}
                    </p>
                    {ticket.scheduledAt ? (
                      <p className="mt-1 text-xs font-medium text-emerald-900">{formatSchedule(ticket.scheduledAt)}</p>
                    ) : null}
                    <div className="mt-1">
                      <PriorityBadge priority={ticket.priority} />
                    </div>
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
                        {TICKET_STATUSES.filter((status) => !isFinishedStatus(status)).map((status) => (
                          <option key={status} value={status}>
                            {STATUS_LABELS[status]}
                          </option>
                        ))}
                      </select>
                      <button className="w-full rounded-md bg-emerald-800 px-2 py-1 text-xs font-semibold text-white">
                        Update
                      </button>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <DispatchCalendarToggle tickets={tickets} month={query.month} store={selectedStore} />

      <h2 className="font-display mt-10 text-xl">Open work orders map</h2>
      <p className="mt-1 text-sm text-stone-600">
        Green pins are work orders at the pivot. Amber pins are Verizon Connect Reveal trucks. Click a
        pin for the work order or Google Maps.
      </p>
      <div className="mt-4">
        <DispatchFleetMap ticketPins={ticketPins(tickets)} canConfigure={session.role === ROLES.ADMIN} />
      </div>
    </div>
  );
}
