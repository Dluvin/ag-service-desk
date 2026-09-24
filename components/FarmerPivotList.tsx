"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AddAssetToFarmPanel } from "@/components/AddAssetToFarmPanel";
import { ListSearch } from "@/components/ListSearch";
import { PivotDocuments, type PivotDocumentItem } from "@/components/PivotDocuments";
import { UNASSIGNED_FARM_LABEL } from "@/lib/farms";
import { useT } from "@/components/I18nProvider";

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
  const t = useT();
  const unassigned = t("common.unassignedFarm");
  const [query, setQuery] = useState("");
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
  const returnTo = `/farmers/${farmerId}`;
  const [pivotFind, setPivotFind] = useState("");
  const [pivotMenuOpen, setPivotMenuOpen] = useState(false);
  const listedPivots = useMemo(() => {
    const q = pivotFind.trim().toLowerCase();
    const list = q
      ? pivots.filter((pivot) =>
          [pivot.name, pivot.serialNumber, pivot.farmName, pivot.locationNote]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q),
        )
      : pivots;
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [pivotFind, pivots]);
  const pivotChoices = useMemo(() => {
    const q = pivotFind.trim().toLowerCase();
    const list = q
      ? pivots.filter((pivot) =>
          [pivot.name, pivot.serialNumber].filter(Boolean).join(" ").toLowerCase().includes(q),
        )
      : pivots;
    return [...list].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 40);
  }, [pivotFind, pivots]);
  const assignable = [
    ...pivots.map((pivot) => ({
      kind: "pivot" as const,
      id: pivot.id,
      name: pivot.name,
      typeName: "Pivots",
      farmName: pivot.farmName,
      farmerId,
      farmerName: "",
      serialNumber: pivot.serialNumber,
    })),
    ...assets.map((asset) => ({
      kind: "asset" as const,
      id: asset.id,
      name: asset.name,
      typeName: asset.typeName,
      farmName: asset.farmName,
      farmerId,
      farmerName: "",
    })),
  ];

  return (
    <>
      <h2 className="font-display mt-8 text-xl">
        {t("assetsByFarm.title", {
          count: searching ? t("assetsByFarm.matched", { matched: matchedAssets, total: totalAssets }) : totalAssets,
        })}
      </h2>
      <p className="mt-2 text-sm text-stone-600">
        {t("assetsByFarm.helpBefore")}{" "}
        <span className="font-semibold">{unassigned}</span> {t("assetsByFarm.helpAfter")}
      </p>
      <ListSearch
        value={query}
        onChange={setQuery}
        label={t("assetsByFarm.search")}
        placeholder={t("assetsByFarm.searchPlaceholder")}
      />
      {searching && matchedAssets === 0 ? (
        <p className="mt-4 text-sm text-stone-600">{t("assetsByFarm.noMatch")}</p>
      ) : matchedAssets === 0 && farms.length === 0 ? (
        <p className="mt-4 text-sm text-stone-600">{t("assetsByFarm.empty")}</p>
      ) : (
        <div className="mt-4 space-y-6">
          {groups.map((group) => {
            const groupPivots = matches.pivots.filter((pivot) => farmKey(pivot.farmId) === farmKey(group.farmId));
            const groupAssets = matches.assets.filter((asset) => farmKey(asset.farmId) === farmKey(group.farmId));
            const empty = groupPivots.length === 0 && groupAssets.length === 0;
            if (empty && searching) return null;
            return (
              <section key={farmKey(group.farmId)} className="rounded-xl border border-stone-200 bg-white p-4">
                <h3 className="font-display text-lg">
                  {group.farmId == null ? <span className="font-semibold">{unassigned}</span> : group.farmName}
                </h3>
                {group.farmId == null ? (
                  <p className="mt-1 text-xs text-stone-500">
                    {t("assetsByFarm.unassignedHelp")}
                  </p>
                ) : null}
                {empty ? (
                  <p className="mt-3 text-sm text-stone-600">{t("assetsByFarm.noneOnFarm")}</p>
                ) : (
                  <>
                    {groupPivots.length ? (
                      <div className="mt-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{t("common.pivots")}</p>
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
                              <Link href={`/pivots/${pivot.id}`} className="text-emerald-800 hover:underline">
                                {pivot.name}
                              </Link>
                              {pivot.documents.length > 0 ? (
                                <span className="text-xs text-stone-500">
                                  {" "}
                                  · {t(pivot.documents.length === 1 ? "common.file" : "common.files", { count: pivot.documents.length })}
                                </span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {groupAssets.length ? (
                      <div className="mt-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{t("assetsByFarm.other")}</p>
                        <ul className="mt-1 space-y-1">
                          {groupAssets.map((asset) => (
                            <li key={asset.id}>
                              <Link href={asset.href} className="text-emerald-800 hover:underline">
                                {asset.name}
                              </Link>
                              <span className="text-sm text-stone-600"> · {asset.typeName}</span>
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
      {canManage ? (
        <AddAssetToFarmPanel
          collapsed
          farmerId={farmerId}
          assets={assignable}
          farms={farms
            .filter((farm): farm is FarmGroup & { farmId: string } => Boolean(farm.farmId))
            .map((farm) => ({ farmId: farm.farmId, farmName: farm.farmName, farmerId }))}
        />
      ) : null}
      {pivots.length > 0 ? (
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-display text-lg">{t("assetsByFarm.allPivots")}</h3>
            <div className="relative min-w-[14rem] flex-1 sm:max-w-xs">
              <label className="sr-only" htmlFor="customer-pivot-find">
                {t("assetsByFarm.findPivot")}
              </label>
              <input
                id="customer-pivot-find"
                value={pivotFind}
                autoComplete="off"
                placeholder={t("assetsByFarm.findPivotPlaceholder")}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                onFocus={() => setPivotMenuOpen(true)}
                onChange={(event) => {
                  setPivotFind(event.target.value);
                  setPivotMenuOpen(true);
                }}
                onBlur={() => {
                  window.setTimeout(() => setPivotMenuOpen(false), 180);
                }}
              />
              {pivotMenuOpen ? (
                <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-stone-200 bg-white py-1 text-sm shadow-lg">
                  {pivotChoices.length === 0 ? (
                    <li className="px-3 py-2 text-stone-500">{t("assetsByFarm.noMatch")}</li>
                  ) : (
                    pivotChoices.map((pivot) => (
                      <li key={pivot.id}>
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left hover:bg-emerald-50"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setPivotFind(pivot.name);
                            setPivotMenuOpen(false);
                          }}
                        >
                          <span className="block font-medium">{pivot.name}</span>
                          {pivot.serialNumber ? (
                            <span className="block text-xs text-stone-500">{pivot.serialNumber}</span>
                          ) : null}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              ) : null}
            </div>
          </div>
          {listedPivots.length === 0 ? (
            <p className="mt-3 text-sm text-stone-600">{t("assetsByFarm.noMatch")}</p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {listedPivots.map((pivot) => (
                <div key={pivot.id} className="rounded-xl border border-stone-200 bg-white p-4">
                  <Link href={`/pivots/${pivot.id}`} className="font-medium text-emerald-800 hover:underline">
                    {pivot.name}
                  </Link>
                  <span className="ml-2 text-xs text-stone-500">
                    {pivot.farmName && pivot.farmName !== UNASSIGNED_FARM_LABEL ? pivot.farmName : unassigned}
                  </span>
                  {canManage || pivot.documents.length > 0 ? (
                    <PivotDocuments
                      pivotId={pivot.id}
                      documents={pivot.documents}
                      canManage={canManage}
                      returnTo={returnTo}
                      compact
                    />
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}
