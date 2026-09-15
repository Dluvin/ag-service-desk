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

const COLUMNS: TicketStatus[] = [...DISPATCH_STATUSES];

export default async function DispatchPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === ROLES.FARMER) redirect("/dashboard");

  const [tickets, technicians] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        ...ticketWhere(session),
        status: { in: COLUMNS },
      },
      include: { farmer: true, pivot: true, technician: true },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    }),
    loadTechnicians(session.organizationId),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl">Dispatch board</h1>
      <p className="mt-1 text-stone-600">
        Open work by status, assign a technician, and see every open ticket on the map.
      </p>

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
                      {ticket.farmer.name} · {ticket.pivot.name}
                    </p>
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

      <h2 className="font-display mt-10 text-xl">Open tickets map</h2>
      <p className="mt-1 text-sm text-stone-600">
        Green pins are tickets at the pivot. Amber pins are Verizon Connect Reveal trucks. Click a
        pin for the ticket or Google Maps.
      </p>
      <div className="mt-4">
        <DispatchFleetMap ticketPins={ticketPins(tickets)} canConfigure={session.role === ROLES.ADMIN} />
      </div>
    </div>
  );
}
