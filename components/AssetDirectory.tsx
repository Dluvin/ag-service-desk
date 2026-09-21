"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ListSearch } from "@/components/ListSearch";
import type { UnifiedAssetRow } from "@/lib/assets";
import { UNASSIGNED_FARM_LABEL } from "@/lib/farms";

function assetSearchText(asset: UnifiedAssetRow) {
  return [
    asset.name,
    asset.typeName,
    asset.farmerName,
    asset.farmName ?? UNASSIGNED_FARM_LABEL,
    asset.serialNumber,
    String(asset.latitude),
    String(asset.longitude),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function assetSubtitle(asset: UnifiedAssetRow) {
  return [asset.typeName, asset.farmerName, asset.farmName ?? UNASSIGNED_FARM_LABEL, asset.serialNumber]
    .filter(Boolean)
    .join(" · ");
}

export function AssetDirectory({ assets }: { assets: UnifiedAssetRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((asset) => assetSearchText(asset).includes(q));
  }, [assets, query]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return [...matches]
      .sort((a, b) => {
        const aq = a.name.toLowerCase().startsWith(q) ? 0 : 1;
        const bq = b.name.toLowerCase().startsWith(q) ? 0 : 1;
        if (aq !== bq) return aq - bq;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 8);
  }, [matches, query]);

  function go(asset: UnifiedAssetRow) {
    setOpen(false);
    router.push(asset.href);
  }

  return (
    <>
      <form
        className="relative"
        onFocus={() => setOpen(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
        }}
        onSubmit={(event) => {
          event.preventDefault();
          if (suggestions[0]) go(suggestions[0]);
        }}
      >
        <ListSearch
          value={query}
          onChange={setQuery}
          label="Search Assets"
          placeholder="Name, type, customer, farm, or serial"
        />
        {open && query.trim() ? (
          <ul className="absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-stone-200 bg-white py-1 text-sm shadow-lg">
            {suggestions.length === 0 ? (
              <li className="px-3 py-2 text-stone-500">No matching Assets</li>
            ) : (
              suggestions.map((asset) => (
                <li key={`${asset.typeSlug}-${asset.id}`}>
                  <Link
                    href={asset.href}
                    className="block px-3 py-2 hover:bg-emerald-50"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => setOpen(false)}
                  >
                    <span className="block font-medium">{asset.name}</span>
                    <span className="block text-xs font-normal text-stone-500">{assetSubtitle(asset)}</span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </form>
      {matches.length === 0 ? (
        <p className="mt-4 text-sm text-stone-600">
          {query.trim() ? "No Assets match that search." : "No Assets yet."}
        </p>
      ) : (
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {matches.map((asset) => (
            <li key={`${asset.typeSlug}-${asset.id}`} className="rounded-xl border border-stone-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{asset.typeName}</p>
              <Link href={asset.href} className="font-semibold text-emerald-900 hover:underline">
                {asset.name}
              </Link>
              <p className="text-sm text-stone-600">
                {asset.farmerName}
                {` · ${asset.farmName ?? UNASSIGNED_FARM_LABEL}`}
              </p>
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
