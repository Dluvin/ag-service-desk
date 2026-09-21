"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ListSearch } from "@/components/ListSearch";
import type { UnifiedAssetRow } from "@/lib/assets";

export function AssetDirectory({ assets }: { assets: UnifiedAssetRow[] }) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((asset) =>
      [asset.name, asset.farmerName, asset.typeName, asset.serialNumber, String(asset.latitude), String(asset.longitude)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [assets, query]);

  return (
    <>
      <ListSearch
        value={query}
        onChange={setQuery}
        label="Search assets"
        placeholder="Name, customer, type, serial, or coordinates"
      />
      {matches.length === 0 ? (
        <p className="mt-4 text-sm text-stone-600">No assets match that search.</p>
      ) : (
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {matches.map((asset) => (
            <li key={`${asset.typeSlug}-${asset.id}`} className="rounded-xl border border-stone-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{asset.typeName}</p>
              <Link href={asset.href} className="font-semibold text-emerald-900 hover:underline">
                {asset.name}
              </Link>
              <p className="text-sm text-stone-600">{asset.farmerName}</p>
              <p className="mt-1 text-xs text-stone-500">
                {asset.latitude.toFixed(5)}, {asset.longitude.toFixed(5)}
                {asset.serialNumber ? ` · ${asset.serialNumber}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
