import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { parseStoreParam } from "@/lib/stores";
import { PrintButton } from "@/components/PrintButton";
import { ReportPrintBrand } from "@/components/PrintCompanyMark";
import { ReportDateForm, ReportStoreFilter, Stat, TableCard, usd } from "@/components/ReportUi";
import { loadCustomerReports } from "@/lib/reports";

export default async function CustomerReportsPage({
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
          Reports
        </Link>
      </p>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Customer reports</h1>
          <p className="mt-1 text-stone-600">
            Work orders, spend, and counts by customer from {report.range.from} through {report.range.to}.
          </p>
        </div>
        <PrintButton label="Print reports" />
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
        <Stat label="Customers" value={String(report.customers)} />
        <Stat label="With work orders in range" value={String(report.withWork)} />
        <Stat label="Opened in range" value={String(report.opened)} />
        <Stat label="Closed in range" value={String(report.closed)} />
        <Stat label="Open now" value={String(report.openNow)} />
        <Stat label="Invoice total (closed)" value={usd(report.invoice)} />
        <Stat label="Parts on closed" value={usd(report.parts)} />
        <Stat label="Labor $ (closed)" value={usd(report.labor)} />
      </div>

      <TableCard title="By customer" className="mt-6">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Store</th>
              <th className="px-3 py-2">Farms</th>
              <th className="px-3 py-2">Pivots</th>
              <th className="px-3 py-2">Opened</th>
              <th className="px-3 py-2">Closed</th>
              <th className="px-3 py-2">Open now</th>
              <th className="px-3 py-2">Invoice</th>
              <th className="px-3 py-2">Parts</th>
              <th className="px-3 py-2">Hours</th>
              <th className="px-3 py-2">Labor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {report.rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-4 text-stone-600">
                  No customers in this view.
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
