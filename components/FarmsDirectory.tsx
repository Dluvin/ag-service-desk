"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ListSearch } from "@/components/ListSearch";
import { useT } from "@/components/I18nProvider";

export type FarmListRow = {
  id: string;
  name: string;
  location: string | null;
  customerId: string;
  customerName: string;
  pivotCount: number;
  assetCount: number;
};

export function FarmsDirectory({ farms }: { farms: FarmListRow[] }) {
  const t = useT();
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return farms;
    return farms.filter((farm) =>
      [farm.name, farm.location, farm.customerName].filter(Boolean).join(" ").toLowerCase().includes(q),
    );
  }, [farms, query]);

  return (
    <>
      <ListSearch value={query} onChange={setQuery} label={t("farms.search")} placeholder={t("farms.searchPlaceholder")} />
      {matches.length === 0 ? (
        <p className="mt-4 text-sm text-stone-600">
          {query.trim() ? t("farms.noMatch") : t("farms.empty")}
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {matches.map((farm) => (
            <li key={farm.id} className="rounded-xl border border-stone-200 bg-white px-4 py-3">
              <Link href={`/farms/${farm.id}`} className="font-semibold text-emerald-900 hover:underline">
                {farm.name}
              </Link>
              <p className="text-sm text-stone-600">
                {t("farms.customer")}
                <Link href={`/farmers/${farm.customerId}`} className="text-emerald-800 hover:underline">
                  {farm.customerName}
                </Link>
              </p>
              {farm.location ? <p className="text-sm text-stone-600">{farm.location}</p> : null}
              <p className="mt-1 text-sm text-stone-600">
                {t("farms.counts", { pivots: farm.pivotCount, assets: farm.assetCount })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
