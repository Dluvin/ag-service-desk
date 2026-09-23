"use client";

import { useMemo, useState } from "react";
import { ListSearch } from "@/components/ListSearch";
import { UNASSIGNED_FARM_LABEL } from "@/lib/farms";

export type AssignableAsset = {
  kind: "pivot" | "asset";
  id: string;
  name: string;
  typeName: string;
  farmName: string | null;
  farmerId: string;
  farmerName: string;
  serialNumber?: string | null;
};

export function assetKey(asset: Pick<AssignableAsset, "kind" | "id">) {
  return `${asset.kind}:${asset.id}`;
}

function assetSearchText(asset: AssignableAsset) {
  return [
    asset.name,
    asset.typeName,
    asset.farmerName,
    asset.farmName ?? UNASSIGNED_FARM_LABEL,
    asset.serialNumber,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function assetSubtitle(asset: AssignableAsset, showCustomer: boolean) {
  return [
    asset.typeName,
    showCustomer ? asset.farmerName : null,
    asset.farmName ?? UNASSIGNED_FARM_LABEL,
    asset.serialNumber,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function AssetAssignTypeahead({
  assets,
  selectedKeys,
  onToggle,
  onClear,
  showCustomer = false,
}: {
  assets: AssignableAsset[];
  selectedKeys: Set<string>;
  onToggle: (asset: AssignableAsset) => void;
  onClear: () => void;
  showCustomer?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selected = useMemo(
    () => assets.filter((asset) => selectedKeys.has(assetKey(asset))),
    [assets, selectedKeys],
  );

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (q ? assets.filter((asset) => assetSearchText(asset).includes(q)) : assets).filter(
      (asset) => !selectedKeys.has(assetKey(asset)),
    );
    return [...list]
      .sort((a, b) => {
        if (!q) return a.name.localeCompare(b.name);
        const aq = a.name.toLowerCase().startsWith(q) ? 0 : 1;
        const bq = b.name.toLowerCase().startsWith(q) ? 0 : 1;
        if (aq !== bq) return aq - bq;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 30);
  }, [assets, query, selectedKeys]);

  function choose(asset: AssignableAsset) {
    onToggle(asset);
    setQuery("");
    setOpen(true);
  }

  return (
    <div className="space-y-2">
      {selected.map((asset) => (
        <input
          key={assetKey(asset)}
          type="hidden"
          name={asset.kind === "pivot" ? "pivotId" : "assetId"}
          value={asset.id}
        />
      ))}
      <div
        className="relative"
        onFocus={() => setOpen(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && suggestions[0]) {
            event.preventDefault();
            choose(suggestions[0]);
          }
        }}
      >
        <ListSearch
          value={query}
          onChange={setQuery}
          label="Assets"
          placeholder={
            showCustomer ? "Name, type, customer, farm, or serial" : "Name, type, farm, or serial"
          }
          className="block text-sm font-medium"
        />
        {open ? (
          <ul className="absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-stone-200 bg-white py-1 text-sm shadow-lg">
            {suggestions.length === 0 ? (
              <li className="px-3 py-2 text-stone-500">
                {query.trim() ? "No matching Assets" : selected.length ? "All matching Assets are selected" : "No Assets yet"}
              </li>
            ) : (
              suggestions.map((asset) => (
                <li key={assetKey(asset)}>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left hover:bg-emerald-50"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(asset)}
                  >
                    <span className="block font-medium">{asset.name}</span>
                    <span className="block text-xs font-normal text-stone-500">
                      {assetSubtitle(asset, showCustomer)}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-stone-800">{selected.length} selected</span>
        {selected.map((asset) => (
          <span
            key={assetKey(asset)}
            className="inline-flex items-center gap-1 rounded-full border border-stone-300 bg-white px-3 py-1 text-sm text-stone-700"
          >
            {asset.name}
            <span className="text-xs text-stone-500">{asset.typeName}</span>
            <button
              type="button"
              className="font-semibold text-stone-500 hover:text-stone-800"
              onClick={() => onToggle(asset)}
              aria-label={`Remove ${asset.name}`}
            >
              ×
            </button>
          </span>
        ))}
        {selected.length ? (
          <button type="button" onClick={onClear} className="text-sm font-semibold text-stone-600 hover:underline">
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}
