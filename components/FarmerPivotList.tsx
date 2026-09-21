"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { ListSearch } from "@/components/ListSearch";
import { PivotDocuments, type PivotDocumentItem } from "@/components/PivotDocuments";
import { assignCustomerAssetsToFarmAction } from "@/lib/actions";
import { UNASSIGNED_FARM_LABEL } from "@/lib/farms";

type FarmerPivot = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  locationNote: string | null;
  serialNumber: string | null;
  farmId: string | null;
  farmName: string | null;
  documents: PivotDocumentItem[];
};

type FarmerAsset = {
  id: string;
  name: string;
  typeName: string;
  href: string;
  farmId: string | null;
  farmName: string | null;
};

type FarmGroup = {
  farmId: string | null;
  farmName: string;
};

function farmKey(farmId: string | null) {
  return farmId ?? "unassigned";
}

function toggleId(ids: Set<string>, id: string) {
  const next = new Set(ids);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

function setIds(ids: Set<string>, nextIds: string[], selected: boolean) {
  const next = new Set(ids);
  for (const id of nextIds) {
    if (selected) next.add(id);
    else next.delete(id);
  }
  return next;
}

export function FarmerPivotList({
  pivots,
  assets,
  farms,
  canManage,
  farmerId,
}: {
  pivots: FarmerPivot[];
  assets: FarmerAsset[];
  farms: FarmGroup[];
  canManage: boolean;
  farmerId: string;
}) {
  const [query, setQuery] = useState("");
  const [selectedPivots, setSelectedPivots] = useState<Set<string>>(new Set());
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const existingFarms = farms.filter((farm): farm is FarmGroup & { farmId: string } => Boolean(farm.farmId));
  const [farmMode, setFarmMode] = useState<"existing" | "new">(existingFarms.length ? "existing" : "new");
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pivotMatches = q
      ? pivots.filter((pivot) =>
          [
            pivot.name,
            pivot.serialNumber,
            pivot.locationNote,
            pivot.farmName ?? UNASSIGNED_FARM_LABEL,
            String(pivot.latitude),
            String(pivot.longitude),
            ...pivot.documents.map((document) => document.fileName),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q),
        )
      : pivots;
    const assetMatches = q
      ? assets.filter((asset) =>
          [asset.name, asset.typeName, asset.farmName ?? UNASSIGNED_FARM_LABEL]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q),
        )
      : assets;
    return { pivots: pivotMatches, assets: assetMatches };
  }, [assets, pivots, query]);

  const groups = useMemo(() => {
    const seen = new Map<string, FarmGroup>();
    for (const farm of farms) {
      seen.set(farmKey(farm.farmId), farm);
    }
    for (const pivot of matches.pivots) {
      const key = farmKey(pivot.farmId);
      if (!seen.has(key)) {
        seen.set(key, { farmId: pivot.farmId, farmName: pivot.farmName ?? UNASSIGNED_FARM_LABEL });
      }
    }
    for (const asset of matches.assets) {
      const key = farmKey(asset.farmId);
      if (!seen.has(key)) {
        seen.set(key, { farmId: asset.farmId, farmName: asset.farmName ?? UNASSIGNED_FARM_LABEL });
      }
    }
    if (!seen.has("unassigned")) {
      seen.set("unassigned", { farmId: null, farmName: UNASSIGNED_FARM_LABEL });
    }
    return [...seen.values()].sort((a, b) => {
      if (a.farmId == null) return 1;
      if (b.farmId == null) return -1;
      return a.farmName.localeCompare(b.farmName);
    });
  }, [farms, matches.assets, matches.pivots]);

  const searching = Boolean(query.trim());
  const totalAssets = pivots.length + assets.length;
  const matchedAssets = matches.pivots.length + matches.assets.length;
  const selectedCount = selectedPivots.size + selectedAssets.size;
  const unassignedPivots = pivots.filter((pivot) => pivot.farmId == null);
  const unassignedAssets = assets.filter((asset) => asset.farmId == null);
  const showDocuments = canManage || pivots.some((pivot) => pivot.documents.length > 0);
  const returnTo = `/farmers/${farmerId}`;

  function selectUnassigned() {
    setSelectedPivots((current) => setIds(current, unassignedPivots.map((pivot) => pivot.id), true));
    setSelectedAssets((current) => setIds(current, unassignedAssets.map((asset) => asset.id), true));
  }

  function clearSelection() {
    setSelectedPivots(new Set());
    setSelectedAssets(new Set());
  }

  function toggleGroup(groupPivots: FarmerPivot[], groupAssets: FarmerAsset[], selected: boolean) {
    setSelectedPivots((current) => setIds(current, groupPivots.map((pivot) => pivot.id), selected));
    setSelectedAssets((current) => setIds(current, groupAssets.map((asset) => asset.id), selected));
  }

  return (
    <>
      <h2 className="font-display mt-8 text-xl">
        Assets by farm ({searching ? `${matchedAssets} of ${totalAssets}` : totalAssets})
      </h2>
      <p className="mt-2 text-sm text-stone-600">
        Existing pivots and other assets stay with this customer as{" "}
        <span className="font-semibold">{UNASSIGNED_FARM_LABEL}</span> until you assign them to a farm.
      </p>
      <ListSearch
        value={query}
        onChange={setQuery}
        label="Search pivots"
        placeholder="Pivot, serial, location, or asset"
      />
      {canManage && totalAssets > 0 ? (
        <ActionForm action={assignCustomerAssetsToFarmAction} className="mt-4 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
          <input type="hidden" name="farmerId" value={farmerId} />
          {[...selectedPivots].map((id) => (
            <input key={`pivot-${id}`} type="hidden" name="pivotId" value={id} />
          ))}
          {[...selectedAssets].map((id) => (
            <input key={`asset-${id}`} type="hidden" name="assetId" value={id} />
          ))}
          <p className="text-sm font-semibold text-stone-800">Add to farm</p>
          <p className="text-sm text-stone-600">
            Check assets below — Unassigned or already on a farm — then assign them to an existing farm or create a new
            farm in this step.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-medium text-stone-800">
              {selectedCount} selected
            </span>
            {unassignedPivots.length + unassignedAssets.length > 0 ? (
              <button
                type="button"
                onClick={selectUnassigned}
                className="font-semibold text-emerald-800 hover:underline"
              >
                Select unassigned
              </button>
            ) : null}
            {selectedCount > 0 ? (
              <button type="button" onClick={clearSelection} className="font-semibold text-stone-600 hover:underline">
                Clear
              </button>
            ) : null}
          </div>
          <fieldset className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="farmMode"
                value="existing"
                checked={farmMode === "existing"}
                onChange={() => setFarmMode("existing")}
                disabled={existingFarms.length === 0}
              />
              Existing farm
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="farmMode"
                value="new"
                checked={farmMode === "new"}
                onChange={() => setFarmMode("new")}
              />
              New farm
            </label>
          </fieldset>
          {farmMode === "existing" ? (
            <label className="block text-sm font-medium">
              Farm
              <select
                name="farmId"
                required
                disabled={existingFarms.length === 0}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 disabled:bg-stone-50"
              >
                <option value="">{existingFarms.length ? "Select a farm" : "No farms yet — create one"}</option>
                {existingFarms.map((farm) => (
                  <option key={farm.farmId} value={farm.farmId}>
                    {farm.farmName}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <label className="block text-sm font-medium">
                Farm name
                <input name="name" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium">
                Location
                <input
                  name="location"
                  placeholder="Optional address or field note"
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </label>
            </>
          )}
          <button
            disabled={selectedCount === 0}
            className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            Assign to farm
          </button>
        </ActionForm>
      ) : null}
      {searching && matchedAssets === 0 ? (
        <p className="mt-4 text-sm text-stone-600">No pivots match that search.</p>
      ) : matchedAssets === 0 && farms.length === 0 ? (
        <p className="mt-4 text-sm text-stone-600">No pivots or other assets on this customer yet.</p>
      ) : (
        <div className="mt-4 space-y-6">
          {groups.map((group) => {
            const groupPivots = matches.pivots.filter((pivot) => farmKey(pivot.farmId) === farmKey(group.farmId));
            const groupAssets = matches.assets.filter((asset) => farmKey(asset.farmId) === farmKey(group.farmId));
            const empty = groupPivots.length === 0 && groupAssets.length === 0;
            const groupSelected =
              groupPivots.every((pivot) => selectedPivots.has(pivot.id)) &&
              groupAssets.every((asset) => selectedAssets.has(asset.id)) &&
              !empty;
            if (empty && searching) return null;
            return (
              <section key={farmKey(group.farmId)} className="rounded-xl border border-stone-200 bg-white p-4">
                <h3 className="font-display text-lg">
                  {group.farmId == null ? <span className="font-semibold">{UNASSIGNED_FARM_LABEL}</span> : group.farmName}
                </h3>
                {group.farmId == null ? (
                  <p className="mt-1 text-xs text-stone-500">
                    Not assigned to a farm. These stay with this customer if a farm is moved.
                  </p>
                ) : null}
                {canManage && !empty ? (
                  <label className="mt-2 flex items-center gap-2 text-sm text-stone-600">
                    <input
                      type="checkbox"
                      checked={groupSelected}
                      onChange={() => toggleGroup(groupPivots, groupAssets, !groupSelected)}
                    />
                    {group.farmId == null ? "Select unassigned assets" : "Select assets on this farm"}
                  </label>
                ) : null}
                {empty ? (
                  <p className="mt-3 text-sm text-stone-600">No assets on this farm yet.</p>
                ) : (
                  <>
                    {groupPivots.length ? (
                      <div className="mt-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Pivots</p>
                        <ul
                          className={
                            groupPivots.length > 8
                              ? "mt-1 columns-2 gap-x-8 sm:columns-3 lg:columns-4"
                              : groupPivots.length > 4
                                ? "mt-1 columns-2 gap-x-8"
                                : "mt-1 space-y-1"
                          }
                        >
                          {groupPivots.map((pivot) => (
                            <li key={pivot.id} className="break-inside-avoid py-0.5">
                              <span className="flex items-start gap-2">
                                {canManage ? (
                                  <input
                                    type="checkbox"
                                    className="mt-1"
                                    checked={selectedPivots.has(pivot.id)}
                                    onChange={() => setSelectedPivots((current) => toggleId(current, pivot.id))}
                                    aria-label={`Select ${pivot.name}`}
                                  />
                                ) : null}
                                <span>
                                  <Link href={`/pivots/${pivot.id}`} className="text-emerald-800 hover:underline">
                                    {pivot.name}
                                  </Link>
                                  {pivot.documents.length > 0 ? (
                                    <span className="text-xs text-stone-500">
                                      {" "}
                                      · {pivot.documents.length} file{pivot.documents.length === 1 ? "" : "s"}
                                    </span>
                                  ) : null}
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {groupAssets.length ? (
                      <div className="mt-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Other assets</p>
                        <ul className="mt-1 space-y-1">
                          {groupAssets.map((asset) => (
                            <li key={asset.id} className="flex items-start gap-2">
                              {canManage ? (
                                <input
                                  type="checkbox"
                                  className="mt-1"
                                  checked={selectedAssets.has(asset.id)}
                                  onChange={() => setSelectedAssets((current) => toggleId(current, asset.id))}
                                  aria-label={`Select ${asset.name}`}
                                />
                              ) : null}
                              <span>
                                <Link href={asset.href} className="text-emerald-800 hover:underline">
                                  {asset.name}
                                </Link>
                                <span className="text-sm text-stone-600"> · {asset.typeName}</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </>
                )}
              </section>
            );
          })}
        </div>
      )}
      {showDocuments && matches.pivots.length > 0 ? (
        <div className="mt-6 space-y-4">
          <h3 className="font-display text-lg">Pivot documents</h3>
          {matches.pivots.map((pivot) =>
            canManage || pivot.documents.length > 0 ? (
              <div key={pivot.id} className="rounded-xl border border-stone-200 bg-white p-4">
                <Link href={`/pivots/${pivot.id}`} className="font-medium text-emerald-800 hover:underline">
                  {pivot.name}
                </Link>
                <span className="ml-2 text-xs text-stone-500">{pivot.farmName ?? UNASSIGNED_FARM_LABEL}</span>
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
