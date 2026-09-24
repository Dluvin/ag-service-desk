import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { parseStoreParam } from "@/lib/stores";
import { ReportPrintBrand } from "@/components/PrintCompanyMark";
import { ReportDateForm, ReportNav, ReportStoreFilter, Stat, TableCard, usd } from "@/components/ReportUi";
import { loadAssetReports, toDayParam } from "@/lib/reports";
import { getRequestLocale } from "@/lib/user-locale";
import { t } from "@/lib/i18n";

export default async function AssetReportsPage({
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
  const report = await loadAssetReports(session, {
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
          <h1 className="font-display text-3xl">{t(locale, "reports.assetTitle")}</h1>
          <p className="mt-1 text-stone-600">
            {t(locale, "reports.assetIntro", { from: report.range.from, to: report.range.to })}
          </p>
        </div>
        <ReportNav current="assets" from={report.range.from} to={report.range.to} store={selectedStore} />
      </div>

      <ReportDateForm from={report.range.from} to={report.range.to} store={selectedStore} />
      <ReportStoreFilter
        stores={stores}
        selected={selectedStore}
        pathname="/reports/assets"
        from={report.range.from}
        to={report.range.to}
        show={session.role !== ROLES.FARMER}
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t(locale, "common.assets")} value={String(report.total)} />
        <Stat label={t(locale, "common.pivots")} value={String(report.pivots)} />
        <Stat label={t(locale, "reports.otherAssets")} value={String(report.generic)} />
        <Stat label={t(locale, "reports.pivotsOpenWork")} value={String(report.withOpenWork)} />
        <Stat label={t(locale, "reports.openedInRange")} value={String(report.opened)} />
        <Stat label={t(locale, "reports.closedInRange")} value={String(report.closed)} />
        <Stat label={t(locale, "reports.invoiceClosed")} value={usd(report.invoice)} />
        <Stat label={t(locale, "reports.quietPivots")} value={String(report.quietPivots)} />
      </div>

      <TableCard title={t(locale, "reports.byType")} className="mt-6">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Assets</th>
              <th className="px-3 py-2">With work orders</th>
              <th className="px-3 py-2">Opened</th>
              <th className="px-3 py-2">Closed</th>
              <th className="px-3 py-2">Open now</th>
              <th className="px-3 py-2">Invoice</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {report.byType.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-stone-600">
                  {t(locale, "reports.noTypes")}
                </td>
              </tr>
            ) : (
              report.byType.map((row) => (
                <tr key={row.slug}>
                  <td className="px-3 py-2">
                    <Link href={`/assets?type=${encodeURIComponent(row.slug)}`} className="font-medium text-emerald-900 hover:underline">
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{row.count}</td>
                  <td className="px-3 py-2">{row.withWork}</td>
                  <td className="px-3 py-2">{row.opened}</td>
                  <td className="px-3 py-2">{row.closed}</td>
                  <td className="px-3 py-2">{row.openNow}</td>
                  <td className="px-3 py-2">{usd(row.invoice)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableCard>

      <TableCard title={t(locale, "reports.pivotsWithWo")} className="mt-6">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-3 py-2">Pivot</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Farm</th>
              <th className="px-3 py-2">Store</th>
              <th className="px-3 py-2">Opened</th>
              <th className="px-3 py-2">Closed</th>
              <th className="px-3 py-2">Open now</th>
              <th className="px-3 py-2">Invoice</th>
              <th className="px-3 py-2">Last work order</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {report.pivotRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-4 text-stone-600">
                  {t(locale, "reports.noPivotWo")}
                </td>
              </tr>
            ) : (
              report.pivotRows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2">
                    <Link href={row.href} className="font-medium text-emerald-900 hover:underline">
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/farmers/${row.customerId}`} className="hover:underline">
                      {row.customer}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{row.farm}</td>
                  <td className="px-3 py-2">{row.store}</td>
                  <td className="px-3 py-2">{row.opened}</td>
                  <td className="px-3 py-2">{row.closed}</td>
                  <td className="px-3 py-2">{row.openNow}</td>
                  <td className="px-3 py-2">{usd(row.invoice)}</td>
                  <td className="px-3 py-2 text-stone-600">{row.lastTicketAt ? toDayParam(row.lastTicketAt) : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableCard>

      <TableCard title={t(locale, "reports.genericAssets")} className="mt-6">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-3 py-2">Asset</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Farm</th>
              <th className="px-3 py-2">Store</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {report.genericRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-stone-600">
                  {t(locale, "reports.noGeneric")}
                </td>
              </tr>
            ) : (
              report.genericRows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2">
                    <Link href={row.href} className="font-medium text-emerald-900 hover:underline">
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{row.typeName}</td>
                  <td className="px-3 py-2">
                    <Link href={`/farmers/${row.customerId}`} className="hover:underline">
                      {row.customer}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{row.farm}</td>
                  <td className="px-3 py-2">{row.store}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}
