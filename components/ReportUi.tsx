import type { ReactNode } from "react";
import Link from "next/link";
import { StoreFilter } from "@/components/StoreFilter";
import { PrintButton } from "@/components/PrintButton";
import type { StoreOption } from "@/lib/stores";

export function usd(value: number) {
  return `$${value.toFixed(2)}`;
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

export function TableCard({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`overflow-hidden rounded-xl border border-stone-200 bg-white ${className}`}>
      <h3 className="border-b border-stone-100 px-4 py-3 font-display text-lg">{title}</h3>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

export function ReportDateForm({
  from,
  to,
  store,
}: {
  from: string;
  to: string;
  store: string;
}) {
  return (
    <form className="no-print mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-white p-4" method="get">
      {store !== "all" ? <input type="hidden" name="store" value={store} /> : null}
      <label className="text-sm font-medium">
        From
        <input name="from" type="date" defaultValue={from} className="mt-1 block rounded-lg border border-stone-300 px-3 py-2" />
      </label>
      <label className="text-sm font-medium">
        To
        <input name="to" type="date" defaultValue={to} className="mt-1 block rounded-lg border border-stone-300 px-3 py-2" />
      </label>
      <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Update dates</button>
    </form>
  );
}

export function ReportStoreFilter({
  stores,
  selected,
  pathname,
  from,
  to,
  show,
}: {
  stores: StoreOption[];
  selected: string;
  pathname: string;
  from: string;
  to: string;
  show: boolean;
}) {
  if (!show) return null;
  return <StoreFilter stores={stores} selected={selected} pathname={pathname} extra={{ from, to }} />;
}

export function ReportNav({
  current,
  from,
  to,
  store,
}: {
  current: "tickets" | "pivots" | "customers" | "farms" | "assets";
  from?: string;
  to?: string;
  store?: string;
}) {
  const query = new URLSearchParams();
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  if (store && store !== "all") query.set("store", store);
  const qs = query.toString() ? `?${query.toString()}` : "";
  const links = [
    { id: "tickets" as const, href: `/reports${qs}`, label: "Work order reports" },
    { id: "pivots" as const, href: `/reports/pivots${qs}`, label: "Pivot reports" },
    { id: "customers" as const, href: `/reports/customers${qs}`, label: "Customer reports" },
    { id: "farms" as const, href: `/reports/farms${qs}`, label: "Farm reports" },
    { id: "assets" as const, href: `/reports/assets${qs}`, label: "Asset reports" },
  ];

  return (
    <div className="no-print flex flex-wrap gap-2">
      {links.map((link) => (
        <Link
          key={link.id}
          href={link.href}
          className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
            current === link.id ? "border-emerald-800 bg-emerald-800 text-white" : "border-stone-300 bg-white"
          }`}
        >
          {link.label}
        </Link>
      ))}
      <PrintButton label="Print reports" />
    </div>
  );
}
