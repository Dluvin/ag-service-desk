"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ListSearch } from "@/components/ListSearch";

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
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return farms;
    return farms.filter((farm) =>
      [farm.name, farm.address, farm.store, farm.contacts, ...farm.farms]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [farms, query]);

  return (
    <>
      <ListSearch value={query} onChange={setQuery} label="Search customers" placeholder="Customer, contact, or address" />
      {matches.length === 0 ? (
        <p className="mt-4 text-sm text-stone-600">No customers match that search.</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {matches.map((farmer) => (
            <li key={farmer.id} className="rounded-xl border border-stone-200 bg-white px-4 py-3">
              <Link href={`/farmers/${farmer.id}`} className="font-semibold text-emerald-900 hover:underline">
                {farmer.name}
              </Link>
              <p className="text-sm text-stone-600">
                {farmer.store ? `${farmer.store} · ` : ""}
                {farmer.pivotCount} pivots · {farmer.ticketCount} work orders
                {farmer.contacts ? ` · ${farmer.contacts}` : ""}
              </p>
              <p className="mt-1 text-sm text-stone-600">
                <span className="font-medium text-stone-700">Farms: </span>
                {farmer.farms.length ? farmer.farms.join(", ") : "None yet"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
