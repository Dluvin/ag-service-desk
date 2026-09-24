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
import { getRequestLocale } from "@/lib/user-locale";
import { t } from "@/lib/i18n";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string; from?: string; to?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const query = await searchParams;
  const locale = await getRequestLocale();
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
          <h1 className="font-display text-3xl">{t(locale, "reports.woTitle")}</h1>
          <p className="mt-1 text-stone-600">
            {t(locale, "reports.woIntro", { from: report.range.from, to: report.range.to })}
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
          <Stat label={t(locale, "reports.openedInRange")} value={String(report.ticket.opened)} />
          <Stat label={t(locale, "reports.closedInRange")} value={String(report.ticket.closed)} />
          <Stat label={t(locale, "common.openNow")} value={String(report.ticket.openNow)} />
          <Stat label={t(locale, "reports.invoiceClosed")} value={usd(report.ticket.invoiceTotal)} />
          <Stat label={t(locale, "reports.partsClosed")} value={usd(report.ticket.partsTotal)} />
          <Stat label={t(locale, "reports.laborHoursClosed")} value={String(report.ticket.laborHours)} />
          <Stat label={t(locale, "reports.laborMoneyClosed")} value={usd(report.ticket.laborTotal)} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <TableCard title={t(locale, "reports.byStatus")}>
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-3 py-2">{t(locale, "dispatch.status")}</th>
                  <th className="px-3 py-2">{t(locale, "reports.inRange")}</th>
                  <th className="px-3 py-2">{t(locale, "reports.allOpenClosed")}</th>
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
          <TableCard title={t(locale, "reports.byPriority")}>
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-3 py-2">{t(locale, "tickets.colPriority")}</th>
                  <th className="px-3 py-2">{t(locale, "reports.workOrders")}</th>
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
          <TableCard title={t(locale, "reports.byTechnician")}>
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-3 py-2">{t(locale, "common.technician")}</th>
                  <th className="px-3 py-2">{t(locale, "common.opened")}</th>
                  <th className="px-3 py-2">{t(locale, "common.closed")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {report.ticket.byTechnician.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-stone-600">
                      {t(locale, "reports.noneInRange")}
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
          <TableCard title={t(locale, "reports.byStore")}>
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-3 py-2">{t(locale, "common.store")}</th>
                  <th className="px-3 py-2">{t(locale, "common.opened")}</th>
                  <th className="px-3 py-2">{t(locale, "common.closed")}</th>
                  <th className="px-3 py-2">{t(locale, "common.invoice")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {report.ticket.byStore.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-stone-600">
                      {t(locale, "reports.noneInRange")}
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

        <TableCard title={t(locale, "reports.closedInRangeTitle")} className="mt-6">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-3 py-2">{t(locale, "tickets.colWo")}</th>
                <th className="px-3 py-2">{t(locale, "tickets.colCustomer")}</th>
                <th className="px-3 py-2">{t(locale, "common.tech")}</th>
                <th className="px-3 py-2">{t(locale, "common.invoice")}</th>
                <th className="px-3 py-2">{t(locale, "common.parts")}</th>
                <th className="px-3 py-2">{t(locale, "common.hours")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {report.ticket.closedRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-stone-600">
                    {t(locale, "reports.noneClosed")}
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
