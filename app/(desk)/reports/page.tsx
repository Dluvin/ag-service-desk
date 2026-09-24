import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { parseStoreParam } from "@/lib/stores";
import { ReportPrintBrand } from "@/components/PrintCompanyMark";
import { StatusBadge, PriorityBadge } from "@/components/Badges";
import { ReportDateForm, ReportNav, ReportStoreFilter, Stat, TableCard, usd } from "@/components/ReportUi";
import { loadReports } from "@/lib/reports";

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
      <ReportPrintBrand />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Work order reports</h1>
          <p className="mt-1 text-stone-600">
            Opened and closed work from {report.range.from} through {report.range.to}, plus what is still open now.
          </p>
        </div>
        <ReportNav current="tickets" from={report.range.from} to={report.range.to} store={selectedStore} />
      </div>

      <ReportDateForm from={report.range.from} to={report.range.to} store={selectedStore} />
      <ReportStoreFilter
        stores={stores}
        selected={selectedStore}
        pathname="/reports"
        from={report.range.from}
        to={report.range.to}
        show={session.role !== ROLES.FARMER}
      />

      <section className="mt-10">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
    </div>
  );
}
