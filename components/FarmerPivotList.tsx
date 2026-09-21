"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ListSearch } from "@/components/ListSearch";
import { PivotDocuments, type PivotDocumentItem } from "@/components/PivotDocuments";

type FarmerPivot = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  locationNote: string | null;
  serialNumber: string | null;
  documents: PivotDocumentItem[];
};

export function FarmerPivotList({
  pivots,
  canManage,
  farmerId,
}: {
  pivots: FarmerPivot[];
  canManage: boolean;
  farmerId: string;
}) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pivots;
    return pivots.filter((pivot) =>
      [
        pivot.name,
        pivot.serialNumber,
        pivot.locationNote,
        String(pivot.latitude),
        String(pivot.longitude),
        ...pivot.documents.map((document) => document.fileName),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [pivots, query]);

  const searching = Boolean(query.trim());
  const columns =
    matches.length > 8
      ? "mt-3 columns-2 gap-x-8 sm:columns-3 lg:columns-4"
      : matches.length > 4
        ? "mt-3 columns-2 gap-x-8"
        : "mt-3";
  const showDocuments = canManage || pivots.some((pivot) => pivot.documents.length > 0);
  const returnTo = `/farmers/${farmerId}`;

  return (
    <>
      <h2 className="font-display mt-8 text-xl">
        Pivots ({searching ? `${matches.length} of ${pivots.length}` : pivots.length})
      </h2>
      <ListSearch
        value={query}
        onChange={setQuery}
        label="Search pivots"
        placeholder="Pivot, serial, location, or file"
      />
      {matches.length === 0 ? (
        <p className="mt-4 text-sm text-stone-600">No pivots match that search.</p>
      ) : (
        <ul className={columns}>
          {matches.map((pivot) => (
            <li key={pivot.id} className="break-inside-avoid py-1">
              <Link href={`/pivots/${pivot.id}`} className="text-emerald-800 hover:underline">
                {pivot.name}
              </Link>
              {pivot.documents.length > 0 ? (
                <span className="text-xs text-stone-500"> · {pivot.documents.length} file{pivot.documents.length === 1 ? "" : "s"}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {showDocuments && matches.length > 0 ? (
        <div className="mt-6 space-y-4">
          <h3 className="font-display text-lg">Pivot documents</h3>
          {matches.map((pivot) =>
            canManage || pivot.documents.length > 0 ? (
              <div key={pivot.id} className="rounded-xl border border-stone-200 bg-white p-4">
                <Link href={`/pivots/${pivot.id}`} className="font-medium text-emerald-800 hover:underline">
                  {pivot.name}
                </Link>
                <PivotDocuments
                  pivotId={pivot.id}
                  documents={pivot.documents}
                  canManage={canManage}
                  returnTo={returnTo}
                  compact
                />
              </div>
            ) : null,
          )}
        </div>
      ) : null}
    </>
  );
}
