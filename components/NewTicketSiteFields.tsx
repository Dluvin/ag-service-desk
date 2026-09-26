"use client";

import { useEffect, useMemo, useState } from "react";
import { MapLocationPicker } from "@/components/MapLocationPicker";
import { FarmTypeahead } from "@/components/FarmTypeahead";
import { PivotTypeahead } from "@/components/PivotTypeahead";
import { assetTypeSingular, isPivotAssetType } from "@/lib/assets";
import { bestNameMatch, OCR_FILL_NEW_SITE_EVENT, typeSlugFromOcrUnit, type OcrFillNewSiteDetail } from "@/lib/ocr-site-match";

type SiteOption = {
  id: string;
  name: string;
  farmerName: string;
  farmerId: string;
  latitude: number;
  longitude: number;
  locationNote: string | null;
  typeSlug: string;
};

type FarmerOption = { id: string; name: string };
type TypeOption = { id: string; name: string; slug: string; kind: string };

export function NewTicketSiteFields({
  pivots,
  assets,
  types,
  farmers,
  canAddFarmer,
  mapsApiKey,
  lockedFarmerId,
  defaultPivotId,
  defaultAssetId,
  defaultTypeSlug,
  defaultFarmerId,
}: {
  pivots: Omit<SiteOption, "typeSlug">[];
  assets: SiteOption[];
  types: TypeOption[];
  farmers: FarmerOption[];
  canAddFarmer: boolean;
  mapsApiKey?: string;
  lockedFarmerId?: string | null;
  defaultPivotId?: string;
  defaultAssetId?: string;
  defaultTypeSlug?: string;
  defaultFarmerId?: string;
}) {
  const pivotType = types.find(isPivotAssetType) ?? types[0] ?? null;
  const defaultPivot = pivots.find((pivot) => pivot.id === defaultPivotId);
  const defaultAsset = assets.find((asset) => asset.id === defaultAssetId);
  const initialFarmId =
    lockedFarmerId || defaultFarmerId || defaultPivot?.farmerId || defaultAsset?.farmerId || "";
  const [typeSlug, setTypeSlug] = useState(
    defaultTypeSlug || (defaultAsset ? defaultAsset.typeSlug : pivotType?.slug) || types[0]?.slug || "pivots",
  );
  const [siteMode, setSiteMode] = useState<"existing" | "new">(
    defaultPivotId || defaultAssetId || pivots.length || assets.length ? "existing" : "new",
  );
  const [farmerMode, setFarmerMode] = useState<"existing" | "new">(
    farmers.length && !lockedFarmerId ? "existing" : "new",
  );
  const [farmerId, setFarmerId] = useState(initialFarmId);
  const [siteId, setSiteId] = useState(defaultPivotId || defaultAssetId || "");

  const selectedType = types.find((type) => type.slug === typeSlug) ?? pivotType;
  const isPivot = selectedType ? isPivotAssetType(selectedType) : true;
  const singular = selectedType ? assetTypeSingular(selectedType.name) : "Asset";

  const sites = useMemo(() => {
    if (isPivot) {
      return pivots.map((pivot) => ({ ...pivot, typeSlug: selectedType?.slug ?? "pivots" }));
    }
    return assets.filter((asset) => asset.typeSlug === typeSlug);
  }, [assets, isPivot, pivots, selectedType?.slug, typeSlug]);

  const farmSites = useMemo(
    () => sites.filter((site) => site.farmerId === farmerId).sort((a, b) => a.name.localeCompare(b.name)),
    [sites, farmerId],
  );
  const lockedFarm = farmers.find((farm) => farm.id === lockedFarmerId) ?? null;

  useEffect(() => {
    function onFill(event: Event | OcrFillNewSiteDetail) {
      const detail =
        event && typeof event === "object" && "detail" in event
          ? (event as CustomEvent<OcrFillNewSiteDetail>).detail
          : (event as OcrFillNewSiteDetail);
      if (!detail || lockedFarmerId) return;

      const nextSlug = typeSlugFromOcrUnit(detail.unitType, types) ?? typeSlug;
      const nextType = types.find((type) => type.slug === nextSlug);
      const nextIsPivot = nextType ? isPivotAssetType(nextType) : true;
      const pool = nextIsPivot
        ? pivots.map((pivot) => ({ ...pivot, typeSlug: nextSlug }))
        : assets.filter((asset) => asset.typeSlug === nextSlug);

      const farm =
        bestNameMatch(farmers, (row) => row.name, [detail.customer, detail.farmName]) ??
        (() => {
          const viaSite = bestNameMatch(pool, (row) => row.farmerName, [detail.customer, detail.farmName]);
          return viaSite ? farmers.find((row) => row.id === viaSite.farmerId) ?? null : null;
        })();
      if (!farm) return;

      const farmPool = pool.filter((site) => site.farmerId === farm.id);
      const site =
        bestNameMatch(farmPool, (row) => row.name, [detail.unitId, detail.jobSite, detail.farmName]) ??
        bestNameMatch(farmPool, (row) => row.locationNote ?? "", [detail.jobSite, detail.farmName]);

      setTypeSlug(nextSlug);
      setSiteMode("existing");
      setFarmerMode("existing");
      setFarmerId(farm.id);
      setSiteId(site?.id ?? "");
    }

    window.addEventListener(OCR_FILL_NEW_SITE_EVENT, onFill);
    return () => window.removeEventListener(OCR_FILL_NEW_SITE_EVENT, onFill);
  }, [assets, farmers, lockedFarmerId, pivots, typeSlug, types]);

  function selectFarm(farm: { id: string; name: string } | null) {
    setFarmerId(farm?.id ?? "");
    setSiteId("");
  }

  function changeType(nextSlug: string) {
    setTypeSlug(nextSlug);
    setSiteId("");
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium">
        Asset type
        <select
          name="assetTypeSlug"
          value={typeSlug}
          onChange={(event) => changeType(event.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        >
          {types.map((type) => (
            <option key={type.id} value={type.slug}>
              {type.name}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="siteMode"
            value="existing"
            checked={siteMode === "existing"}
            onChange={() => setSiteMode("existing")}
            disabled={sites.length === 0}
          />
          Existing {singular.toLowerCase()}
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="siteMode"
            value="new"
            checked={siteMode === "new"}
            onChange={() => setSiteMode("new")}
          />
          New {singular.toLowerCase()}
        </label>
      </fieldset>

      {siteMode === "existing" ? (
        <div className="space-y-4">
          {lockedFarmerId ? (
            <p className="text-sm text-stone-600">
              Customer: <span className="font-medium text-stone-800">{lockedFarm?.name ?? "Your customer"}</span>
            </p>
          ) : (
            <FarmTypeahead farms={farmers} farmerId={farmerId} onSelect={selectFarm} required />
          )}
          <PivotTypeahead
            key={`${typeSlug}-${farmerId || "no-farm"}`}
            pivots={farmSites}
            pivotId={siteId}
            onSelect={(site) => setSiteId(site?.id ?? "")}
            required={siteMode === "existing"}
            disabled={!farmerId}
            label={singular}
            emptyLabel={`No matching ${selectedType?.name.toLowerCase() ?? "assets"}`}
            hiddenName={isPivot ? "pivotId" : "assetId"}
          />
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border border-stone-200 bg-stone-50 p-4">
          <p className="text-sm font-semibold text-stone-800">New {singular.toLowerCase()}</p>
          {lockedFarmerId ? (
            <input type="hidden" name="farmerId" value={lockedFarmerId} />
          ) : canAddFarmer ? (
            <>
              <fieldset className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="farmerMode"
                    value="existing"
                    checked={farmerMode === "existing"}
                    onChange={() => setFarmerMode("existing")}
                    disabled={farmers.length === 0}
                  />
                  Existing customer
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="farmerMode"
                    value="new"
                    checked={farmerMode === "new"}
                    onChange={() => setFarmerMode("new")}
                  />
                  New customer
                </label>
              </fieldset>
              {farmerMode === "existing" ? (
                <FarmTypeahead farms={farmers} farmerId={farmerId} onSelect={selectFarm} required />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-medium sm:col-span-2">
                    Customer name
                    <input name="farmerName" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
                  </label>
                  <label className="block text-sm font-medium sm:col-span-2">
                    Address
                    <input name="farmerAddress" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
                  </label>
                  <label className="block text-sm font-medium sm:col-span-2">
                    Contact name
                    <input name="farmerContactName" placeholder="Person at the customer" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
                  </label>
                  <label className="block text-sm font-medium">
                    Phone
                    <input name="farmerPhone" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
                  </label>
                  <label className="block text-sm font-medium">
                    Email
                    <input name="farmerEmail" type="email" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
                  </label>
                </div>
              )}
            </>
          ) : (
            <FarmTypeahead farms={farmers} farmerId={farmerId} onSelect={selectFarm} required />
          )}

          <label className="block text-sm font-medium">
            {singular} name
            <input name="assetName" required placeholder={`North ${singular}`} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            Serial number
            <input name="serialNumber" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <MapLocationPicker apiKey={mapsApiKey} />
        </div>
      )}
    </div>
  );
}
