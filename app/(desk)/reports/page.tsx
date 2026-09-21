import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { parseStoreParam } from "@/lib/stores";
import { StoreFilter } from "@/components/StoreFilter";
import { PrintButton } from "@/components/PrintButton";
import { StatusBadge, PriorityBadge } from "@/components/Badges";
import { STARTUP_SEASON_YEAR } from "@/lib/startup";
import { loadReports, toDayParam } from "@/lib/reports";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string; from?: string; to?: string }>;
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
  const report = await loadReports(session, {
    store: session.role === ROLES.FARMER ? "all" : selectedStore,
    from: query.from,
    to: query.to,
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Reports</h1>
          <p className="mt-1 text-stone-600">
            Work order and pivot activity from {report.range.from} through {report.range.to}.
          </p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <a href="#ticket-reports" className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold">
            Work order reports
          </a>
          <a href="#pivot-reports" className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold">
            Pivot reports
          </a>
          <PrintButton label="Print reports" />
        </div>
      </div>

      <form className="no-print mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-white p-4" method="get">
        {selectedStore !== "all" ? <input type="hidden" name="store" value={selectedStore} /> : null}
        <label className="text-sm font-medium">
          From
          <input name="from" type="date" defaultValue={report.range.from} className="mt-1 block rounded-lg border border-stone-300 px-3 py-2" />
        </label>
        <label className="text-sm font-medium">
          To
          <input name="to" type="date" defaultValue={report.range.to} className="mt-1 block rounded-lg border border-stone-300 px-3 py-2" />
        </label>
        <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Update dates</button>
      </form>
      {session.role !== ROLES.FARMER ? (
        <StoreFilter
          stores={stores}
          selected={selectedStore}
          pathname="/reports"
          extra={{ from: report.range.from, to: report.range.to }}
        />
      ) : null}

      <section id="ticket-reports" className="mt-10 scroll-mt-6">
        <h2 className="font-display text-2xl">Work order reports</h2>
        <p className="mt-1 text-sm text-stone-600">Opened and closed work in this date range, plus what is still open now.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Opened in range" value={String(report.ticket.opened)} />
          <Stat label="Closed in range" value={String(report.ticket.closed)} />
          <Stat label="Open now" value={String(report.ticket.openNow)} />
          <Stat label="Invoice total (closed)" value={usd(report.ticket.invoiceTotal)} />
          <Stat label="Parts on closed" value={usd(report.ticket.partsTotal)} />
          <Stat label="Labor hours (closed)" value={String(report.ticket.laborHours)} />
          <Stat label="Labor $ (closed)" value={usd(report.ticket.laborTotal)} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <TableCard title="By status">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">In range</th>
                  <th className="px-3 py-2">All open/closed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {report.ticket.byStatus.map((row) => (
                  <tr key={row.status}>
                    <td className="px-3 py-2">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-3 py-2">{row.opened}</td>
                    <td className="px-3 py-2">{row.all}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
          <TableCard title="By priority (opened in range)">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-3 py-2">Priority</th>
                  <th className="px-3 py-2">Work orders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {report.ticket.byPriority.map((row) => (
                  <tr key={row.priority}>
                    <td className="px-3 py-2">
                      <PriorityBadge priority={row.priority} />
                    </td>
                    <td className="px-3 py-2">{row.opened}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
          <TableCard title="By technician">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-3 py-2">Technician</th>
                  <th className="px-3 py-2">Opened</th>
                  <th className="px-3 py-2">Closed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {report.ticket.byTechnician.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-stone-600">
                      No work orders in this range.
                    </td>
                  </tr>
                ) : (
                  report.ticket.byTechnician.map((row) => (
                    <tr key={row.name}>
                      <td className="px-3 py-2">{row.name}</td>
                      <td className="px-3 py-2">{row.opened}</td>
                      <td className="px-3 py-2">{row.closed}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </TableCard>
          <TableCard title="By store">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-3 py-2">Store</th>
                  <th className="px-3 py-2">Opened</th>
                  <th className="px-3 py-2">Closed</th>
                  <th className="px-3 py-2">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {report.ticket.byStore.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-stone-600">
                      No work orders in this range.
                    </td>
                  </tr>
                ) : (
                  report.ticket.byStore.map((row) => (
                    <tr key={row.name}>
                      <td className="px-3 py-2">{row.name}</td>
                      <td className="px-3 py-2">{row.opened}</td>
                      <td className="px-3 py-2">{row.closed}</td>
                      <td className="px-3 py-2">{usd(row.invoice)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </TableCard>
        </div>

        <TableCard title="Closed work orders in range" className="mt-6">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-3 py-2">Work order</th>
                <th className="px-3 py-2">Customer / pivot</th>
                <th className="px-3 py-2">Tech</th>
                <th className="px-3 py-2">Invoice</th>
                <th className="px-3 py-2">Parts</th>
                <th className="px-3 py-2">Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {report.ticket.closedRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-stone-600">
                    No work orders were closed in this range.
                  </td>
                </tr>
              ) : (
                report.ticket.closedRows.map((ticket) => (
                  <tr key={ticket.id}>
                    <td className="px-3 py-2">
                      <Link href={`/tickets/${ticket.id}`} className="font-medium text-emerald-900 hover:underline">
                        #{ticket.number} {ticket.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-stone-600">
                      {ticket.farm}
                      <br />
                      {ticket.pivot}
                    </td>
                    <td className="px-3 py-2">{ticket.technician}</td>
                    <td className="px-3 py-2">
                      {ticket.invoiceNumber ?? "—"}
                      {ticket.invoiceAmount != null ? ` · ${usd(ticket.invoiceAmount)}` : ""}
                    </td>
                    <td className="px-3 py-2">{usd(ticket.partsTotal)}</td>
                    <td className="px-3 py-2">{ticket.laborHours}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableCard>
      </section>

      <section id="pivot-reports" className="mt-12 scroll-mt-6">
        <h2 className="font-display text-2xl">Pivot reports</h2>
        <p className="mt-1 text-sm text-stone-600">
          Service load by machine in this range, plus {STARTUP_SEASON_YEAR} startup status.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Pivots" value={String(report.pivot.total)} />
          <Stat label="With open work orders" value={String(report.pivot.withOpenWork)} />
          <Stat label="No work orders in range" value={String(report.pivot.quietInRange)} />
          <Stat label={`${STARTUP_SEASON_YEAR} passed / failed`} value={`${report.pivot.startupPassed} / ${report.pivot.startupFailed}`} />
        </div>

        <TableCard title="Busiest pivots in range" className="mt-6">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-3 py-2">Pivot</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Store</th>
                <th className="px-3 py-2">Work orders</th>
                <th className="px-3 py-2">Open</th>
                <th className="px-3 py-2">Last work order</th>
                <th className="px-3 py-2">Startup</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {report.pivot.busiest.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-stone-600">
                    No pivots in this view.
                  </td>
                </tr>
              ) : (
                report.pivot.busiest.map((pivot) => (
                  <tr key={pivot.id}>
                    <td className="px-3 py-2">
                      <Link href={`/pivots/${pivot.id}`} className="font-medium text-emerald-900 hover:underline">
                        {pivot.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/farmers/${pivot.farmId}`} className="hover:underline">
                        {pivot.farm}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{pivot.store}</td>
                    <td className="px-3 py-2">{pivot.ticketsInRange}</td>
                    <td className="px-3 py-2">{pivot.openTickets}</td>
                    <td className="px-3 py-2 text-stone-600">
                      {pivot.lastTicketAt ? toDayParam(pivot.lastTicketAt) : "—"}
                    </td>
                    <td className="px-3 py-2">{pivot.startup}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableCard>

        <TableCard title="Pivots with open work orders" className="mt-6">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-3 py-2">Pivot</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Open work orders</th>
                <th className="px-3 py-2">Startup</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {report.pivot.openWork.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-stone-600">
                    No open work orders on pivots in this view.
                  </td>
                </tr>
              ) : (
                report.pivot.openWork.map((pivot) => (
                  <tr key={pivot.id}>
                    <td className="px-3 py-2">
                      <Link href={`/pivots/${pivot.id}`} className="font-medium text-emerald-900 hover:underline">
                        {pivot.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{pivot.farm}</td>
                    <td className="px-3 py-2">{pivot.openTickets}</td>
                    <td className="px-3 py-2">{pivot.startup}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableCard>
      </section>
    </div>
  );
}

function usd(value: number) {
  return `$${value.toFixed(2)}`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function TableCard({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`overflow-hidden rounded-xl border border-stone-200 bg-white ${className}`}>
      <h3 className="border-b border-stone-100 px-4 py-3 font-display text-lg">{title}</h3>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}
