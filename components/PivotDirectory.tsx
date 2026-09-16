"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ListSearch } from "@/components/ListSearch";

type PivotRow = {
  id: string;
  name: string;
  farmerName: string;
  latitude: number;
  longitude: number;
  serialNumber: string | null;
  openTickets: number;
  notes: number;
};

export function PivotDirectory({ pivots }: { pivots: PivotRow[] }) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pivots;
    return pivots.filter((pivot) =>
      [pivot.name, pivot.farmerName, pivot.serialNumber, String(pivot.latitude), String(pivot.longitude)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [pivots, query]);

  return (
    <>
      <ListSearch value={query} onChange={setQuery} label="Search pivots" placeholder="Pivot, farm, serial, or coordinates" />
      {matches.length === 0 ? (
        <p className="mt-4 text-sm text-stone-600">No pivots match that search.</p>
      ) : (
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {matches.map((pivot) => (
            <li key={pivot.id} className="rounded-xl border border-stone-200 bg-white p-4">
              <Link href={`/pivots/${pivot.id}`} className="font-semibold text-emerald-900 hover:underline">
                {pivot.name}
              </Link>
              <p className="text-sm text-stone-600">{pivot.farmerName}</p>
              <p className="mt-1 text-xs text-stone-500">
                {pivot.latitude.toFixed(5)}, {pivot.longitude.toFixed(5)}
                {pivot.serialNumber ? ` · ${pivot.serialNumber}` : ""}
              </p>
              <p className="mt-2 text-sm">
                {pivot.openTickets} open ticket(s)
                {pivot.notes > 0 ? ` · ${pivot.notes} note(s)` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
