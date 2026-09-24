import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { parseStoreParam } from "@/lib/stores";
import { ReportPrintBrand } from "@/components/PrintCompanyMark";
import { ReportDateForm, ReportNav, ReportStoreFilter, Stat, TableCard, usd } from "@/components/ReportUi";
import { loadCustomerReports } from "@/lib/reports";
import { getRequestLocale } from "@/lib/user-locale";
import { t } from "@/lib/i18n";

export default async function CustomerReportsPage({
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
  const report = await loadCustomerReports(session, {
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
          <h1 className="font-display text-3xl">{t(locale, "reports.customerTitle")}</h1>
          <p className="mt-1 text-stone-600">
            {t(locale, "reports.customerIntro", { from: report.range.from, to: report.range.to })}
          </p>
        </div>
        <ReportNav current="customers" from={report.range.from} to={report.range.to} store={selectedStore} />
      </div>

      <ReportDateForm from={report.range.from} to={report.range.to} store={selectedStore} />
      <ReportStoreFilter
        stores={stores}
        selected={selectedStore}
        pathname="/reports/customers"
        from={report.range.from}
        to={report.range.to}
        show={session.role !== ROLES.FARMER}
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t(locale, "nav.customers")} value={String(report.customers)} />
        <Stat label={t(locale, "reports.withWork")} value={String(report.withWork)} />
        <Stat label={t(locale, "reports.openedInRange")} value={String(report.opened)} />
        <Stat label={t(locale, "reports.closedInRange")} value={String(report.closed)} />
        <Stat label={t(locale, "common.openNow")} value={String(report.openNow)} />
        <Stat label={t(locale, "reports.invoiceClosed")} value={usd(report.invoice)} />
        <Stat label={t(locale, "reports.partsClosed")} value={usd(report.parts)} />
        <Stat label={t(locale, "reports.laborMoneyClosed")} value={usd(report.labor)} />
      </div>

      <TableCard title={t(locale, "reports.byCustomer")} className="mt-6">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-3 py-2">{t(locale, "common.customer")}</th>
              <th className="px-3 py-2">{t(locale, "common.store")}</th>
              <th className="px-3 py-2">{t(locale, "common.farms")}</th>
              <th className="px-3 py-2">{t(locale, "common.pivots")}</th>
              <th className="px-3 py-2">{t(locale, "common.opened")}</th>
              <th className="px-3 py-2">{t(locale, "common.closed")}</th>
              <th className="px-3 py-2">{t(locale, "common.openNow")}</th>
              <th className="px-3 py-2">{t(locale, "common.invoice")}</th>
              <th className="px-3 py-2">{t(locale, "common.parts")}</th>
              <th className="px-3 py-2">{t(locale, "common.hours")}</th>
              <th className="px-3 py-2">{t(locale, "nav.labor")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {report.rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-4 text-stone-600">
                  {t(locale, "reports.noCustomers")}
                </td>
              </tr>
            ) : (
              report.rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2">
                    <Link href={`/farmers/${row.id}`} className="font-medium text-emerald-900 hover:underline">
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{row.store}</td>
                  <td className="px-3 py-2">{row.farms}</td>
                  <td className="px-3 py-2">{row.pivots}</td>
                  <td className="px-3 py-2">{row.opened}</td>
                  <td className="px-3 py-2">{row.closed}</td>
                  <td className="px-3 py-2">{row.openNow}</td>
                  <td className="px-3 py-2">{usd(row.invoice)}</td>
                  <td className="px-3 py-2">{usd(row.parts)}</td>
                  <td className="px-3 py-2">{row.laborHours}</td>
                  <td className="px-3 py-2">{usd(row.labor)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}
