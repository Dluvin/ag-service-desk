import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { homePath } from "@/lib/home";
import { StoreFilter } from "@/components/StoreFilter";
import { parseStoreParam, STORE_ALL, STORE_NONE, storeFarmerWhere } from "@/lib/stores";
import {
  formatSaleDate,
  isOpenSale,
  isSaleStatus,
  SALE_STATUSES,
  saleStatusLabel,
} from "@/lib/sales";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; store?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === ROLES.FARMER) redirect(homePath(session.role));

  const query = await searchParams;
  const rawStatus = (query.status || "open").trim();
  const statusFilter =
    rawStatus === "open" || rawStatus === "all" || isSaleStatus(rawStatus) ? rawStatus : "open";
  const stores = await prisma.store.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const selectedStore = parseStoreParam(query.store, stores);
  const storeFilter =
    selectedStore === STORE_ALL
      ? {}
      : selectedStore === STORE_NONE
        ? { storeId: null, farmer: { storeId: null } }
        : {
            OR: [{ storeId: selectedStore }, { storeId: null, farmer: storeFarmerWhere(selectedStore) }],
          };

  const sales = await prisma.sale.findMany({
    where: {
      organizationId: session.organizationId,
      ...storeFilter,
      ...(statusFilter === "open"
        ? { status: { notIn: ["COMPLETED", "LOST"] } }
        : statusFilter === "all"
          ? {}
          : { status: statusFilter }),
    },
    include: {
      farmer: { select: { name: true } },
      farm: { select: { name: true } },
      store: { select: { name: true } },
      salesmanUser: { select: { name: true } },
      pivot: { select: { id: true, name: true } },
      asset: { select: { id: true, name: true, assetType: { select: { name: true } } } },
    },
    orderBy: [{ lastContactAt: "desc" }, { updatedAt: "desc" }],
  });

  const statusLinks = [
    { id: "open", name: "Open pipeline" },
    { id: "all", name: "All" },
    ...SALE_STATUSES.map((status) => ({ id: status, name: saleStatusLabel(status) })),
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Sales</h1>
          <p className="mt-1 text-sm text-stone-600">
            Track pivot and equipment prospects. Finish a sale to create the pivot, pump, or other asset.
          </p>
        </div>
        <Link href="/sales/new" className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
          New sale
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {statusLinks.map((link) => {
          const active = link.id === statusFilter;
          const params = new URLSearchParams();
          if (link.id !== "open") params.set("status", link.id);
          if (selectedStore !== STORE_ALL) params.set("store", selectedStore);
          const href = params.toString() ? `/sales?${params}` : "/sales";
          return (
            <Link
              key={link.id}
              href={href}
              className={
                active
                  ? "rounded-full bg-emerald-800 px-3 py-1 text-sm font-semibold text-white"
                  : "rounded-full border border-stone-300 bg-white px-3 py-1 text-sm text-stone-700 hover:border-emerald-700"
              }
            >
              {link.name}
            </Link>
          );
        })}
      </div>

      <StoreFilter
        stores={stores}
        selected={selectedStore}
        pathname="/sales"
        extra={{ status: statusFilter === "open" ? undefined : statusFilter }}
      />

      <p className="mt-3 text-sm text-stone-500">
        {sales.length === 0
          ? "No sales match these filters."
          : `${sales.length} sale${sales.length === 1 ? "" : "s"}`}
      </p>

      <div className="mt-4 overflow-hidden rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-200/80 text-xs font-semibold uppercase tracking-wide text-stone-800">
            <tr>
              <th className="px-4 py-2">Last contact</th>
              <th className="px-4 py-2">Salesman</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Job lead</th>
              <th className="px-4 py-2">Location</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {sales.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-stone-600">
                  No sales yet.{" "}
                  <Link href="/sales/new" className="font-semibold text-emerald-800 hover:underline">
                    Add the first prospect
                  </Link>
                  .
                </td>
              </tr>
            ) : (
              sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 text-stone-600">{formatSaleDate(sale.lastContactAt)}</td>
                  <td className="px-4 py-3">
                    {sale.salesmanUser?.name || sale.salesmanName || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/sales/${sale.id}`} className="font-medium text-emerald-900 hover:underline">
                      {sale.farmer?.name || "No customer yet"}
                    </Link>
                    {sale.farm?.name ? <span className="block text-xs text-stone-500">{sale.farm.name}</span> : null}
                    {sale.store?.name ? <span className="block text-xs text-stone-500">{sale.store.name}</span> : null}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/sales/${sale.id}`} className="text-emerald-900 hover:underline">
                      {sale.jobLead}
                    </Link>
                    {sale.contactName || sale.contactPhone ? (
                      <span className="mt-1 block text-xs text-stone-500">
                        {[sale.contactName, sale.contactPhone].filter(Boolean).join(" · ")}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-stone-600">{sale.location || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        sale.status === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-900"
                          : sale.status === "LOST"
                            ? "bg-stone-200 text-stone-700"
                            : isOpenSale(sale.status)
                              ? "bg-amber-100 text-amber-950"
                              : "bg-stone-100 text-stone-700"
                      }`}
                    >
                      {saleStatusLabel(sale.status)}
                    </span>
                    {sale.pivot ? (
                      <Link href={`/pivots/${sale.pivot.id}`} className="mt-1 block text-xs font-semibold text-emerald-800 hover:underline">
                        Pivot: {sale.pivot.name}
                      </Link>
                    ) : null}
                    {sale.asset ? (
                      <Link href={`/assets/${sale.asset.id}`} className="mt-1 block text-xs font-semibold text-emerald-800 hover:underline">
                        {sale.asset.assetType.name}: {sale.asset.name}
                      </Link>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
