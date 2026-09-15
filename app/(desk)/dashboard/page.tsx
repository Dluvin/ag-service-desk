import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pivotWhere, ticketWhere } from "@/lib/scope";
import { ROLES } from "@/lib/roles";
import { StatusBadge } from "@/components/Badges";
import { redirect } from "next/navigation";
import { STARTUP_SEASON_YEAR } from "@/lib/startup";
import { AllTicketsMap } from "@/components/AllTicketsMap";
import { OPEN_TICKET_STATUSES, ticketPins } from "@/lib/map-pins";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [openTickets, pivots, farmers, techs] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        ...ticketWhere(session),
        status: { in: [...OPEN_TICKET_STATUSES] },
      },
      include: { farmer: true, pivot: true, technician: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.pivot.count({ where: pivotWhere(session) }),
    session.role === ROLES.ADMIN
      ? prisma.farmer.count({ where: { organizationId: session.organizationId } })
      : Promise.resolve(null),
    session.role === ROLES.ADMIN
      ? prisma.user.count({ where: { organizationId: session.organizationId, role: ROLES.TECHNICIAN } })
      : Promise.resolve(null),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl">Dashboard</h1>
      <p className="mt-1 text-stone-600">
        {session.role === ROLES.FARMER
          ? "Status on your pivots and service calls."
          : session.role === ROLES.TECHNICIAN
            ? "Tickets assigned to you."
            : "Dispatch across your company."}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Active tickets" value={String(openTickets.length)} />
        <Stat label="Pivots" value={String(pivots)} />
        <Stat
          label={session.role === ROLES.ADMIN ? "Farms / techs" : "Your role"}
          value={
            session.role === ROLES.ADMIN
              ? `${farmers} / ${techs}`
              : session.role === ROLES.TECHNICIAN
                ? "Technician"
                : "Farmer portal"
          }
        />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {session.role !== ROLES.FARMER ? (
          <Link href="/dispatch" className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
            Dispatch board
          </Link>
        ) : null}
        <Link href="/tickets/new" className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold">
          New service ticket
        </Link>
        <Link href="/startup" className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold">
          {STARTUP_SEASON_YEAR} startup
        </Link>
        <Link href="/map" className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold">
          Open tickets map
        </Link>
        {session.role !== ROLES.FARMER ? (
          <Link href="/pivots/new" className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold">
            Add pivot
          </Link>
        ) : null}
      </div>

      <h2 className="font-display mt-10 text-xl">Open tickets map</h2>
      <p className="mt-1 text-sm text-stone-600">Every active call at the pivot location.</p>
      <div className="mt-4">
        <AllTicketsMap pins={ticketPins(openTickets)} />
      </div>

      <h2 className="font-display mt-10 text-xl">Recent tickets</h2>
      <div className="mt-3 overflow-hidden rounded-xl border border-stone-200 bg-white">
        {openTickets.length === 0 ? (
          <p className="p-4 text-sm text-stone-600">No active tickets.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {openTickets.slice(0, 8).map((ticket) => (
              <li key={ticket.id}>
                <Link href={`/tickets/${ticket.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-stone-50">
                  <div>
                    <p className="font-medium">#{ticket.number} {ticket.title}</p>
                    <p className="text-sm text-stone-600">
                      {ticket.farmer.name} · {ticket.pivot.name}
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
