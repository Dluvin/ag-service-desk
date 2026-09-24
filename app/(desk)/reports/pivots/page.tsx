import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { parseStoreParam } from "@/lib/stores";
import { ReportPrintBrand } from "@/components/PrintCompanyMark";
import { ReportDateForm, ReportNav, ReportStoreFilter, Stat, TableCard } from "@/components/ReportUi";
import { STARTUP_SEASON_YEAR } from "@/lib/startup";
import { loadReports, toDayParam } from "@/lib/reports";
import { getRequestLocale } from "@/lib/user-locale";
import { t } from "@/lib/i18n";

export default async function PivotReportsPage({
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
      <p className="text-sm text-stone-500">
        <Link href="/reports" className="text-emerald-800 hover:underline">
          {t(locale, "nav.reports")}
        </Link>
      </p>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">{t(locale, "reports.pivotTitle")}</h1>
          <p className="mt-1 text-stone-600">
            {t(locale, "reports.pivotIntro", { from: report.range.from, to: report.range.to, year: STARTUP_SEASON_YEAR })}
          </p>
        </div>
        <ReportNav current="pivots" from={report.range.from} to={report.range.to} store={selectedStore} />
      </div>

      <ReportDateForm from={report.range.from} to={report.range.to} store={selectedStore} />
      <ReportStoreFilter
        stores={stores}
        selected={selectedStore}
        pathname="/reports/pivots"
        from={report.range.from}
        to={report.range.to}
        show={session.role !== ROLES.FARMER}
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t(locale, "common.pivots")} value={String(report.pivot.total)} />
        <Stat label={t(locale, "reports.withOpenWo")} value={String(report.pivot.withOpenWork)} />
        <Stat label={t(locale, "reports.quietRange")} value={String(report.pivot.quietInRange)} />
        <Stat label={t(locale, "reports.startupPf", { year: STARTUP_SEASON_YEAR })} value={`${report.pivot.startupPassed} / ${report.pivot.startupFailed}`} />
      </div>

      <TableCard title={t(locale, "reports.busiest")} className="mt-6">
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
                  {t(locale, "reports.noPivots")}
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

      <TableCard title={t(locale, "reports.openOnPivots")} className="mt-6">
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
                  {t(locale, "reports.noOpenOnPivots")}
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
    </div>
  );
}
