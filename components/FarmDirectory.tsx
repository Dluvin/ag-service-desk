"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ListSearch } from "@/components/ListSearch";
import { useT } from "@/components/I18nProvider";

type FarmRow = {
  id: string;
  name: string;
  address: string | null;
  store: string | null;
  pivotCount: number;
  ticketCount: number;
  contacts: string;
  farms: string[];
};

export function FarmDirectory({ farms }: { farms: FarmRow[] }) {
  const t = useT();
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return farms;
    return farms.filter((farm) =>
      [farm.name, farm.address, farm.store ?? "unassigned", farm.contacts, ...farm.farms]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [farms, query]);

  return (
    <>
      <ListSearch value={query} onChange={setQuery} label={t("customers.search")} placeholder={t("customers.searchPlaceholder")} />
      {matches.length === 0 ? (
        <p className="mt-4 text-sm text-stone-600">{t("customers.noMatch")}</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {matches.map((farmer) => (
            <li key={farmer.id} className="rounded-xl border border-stone-200 bg-white px-4 py-3">
              <Link href={`/farmers/${farmer.id}`} className="font-semibold text-emerald-900 hover:underline">
                {farmer.name}
              </Link>
              <p className="mt-1 text-sm">
                <span className="font-medium text-stone-700">{t("common.store")}: </span>
                {farmer.store ? (
                  <span className="text-stone-800">{farmer.store}</span>
                ) : (
                  <span className="font-medium text-amber-800">{t("common.unassigned")}</span>
                )}
              </p>
              <p className="text-sm text-stone-600">
                {t("customers.counts", { pivots: farmer.pivotCount, tickets: farmer.ticketCount })}
                {farmer.contacts ? ` · ${farmer.contacts}` : ""}
              </p>
              <p className="mt-1 text-sm text-stone-600">
                <span className="font-medium text-stone-700">{t("customers.farmsLabel")}</span>
                {farmer.farms.length ? farmer.farms.join(", ") : t("common.noneYet")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
