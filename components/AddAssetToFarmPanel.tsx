"use client";

import { useMemo, useState } from "react";
import { ActionForm } from "@/components/ActionForm";
import {
  AssetAssignTypeahead,
  assetKey,
  type AssignableAsset,
} from "@/components/AssetAssignTypeahead";
import { assignCustomerAssetsToFarmAction } from "@/lib/actions";

export type AssignFarmOption = {
  farmId: string;
  farmName: string;
  farmerId: string;
  farmerName?: string;
};

export function AddAssetToFarmPanel({
  farmerId,
  assets,
  farms,
  showCustomer = false,
  lockFarmId,
}: {
  farmerId?: string;
  assets: AssignableAsset[];
  farms: AssignFarmOption[];
  showCustomer?: boolean;
  lockFarmId?: string;
}) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const selectedAssets = useMemo(
    () => assets.filter((asset) => selectedKeys.has(assetKey(asset))),
    [assets, selectedKeys],
  );
  const selectedFarmerIds = [...new Set(selectedAssets.map((asset) => asset.farmerId))];
  const mixedCustomers = showCustomer && selectedFarmerIds.length > 1;
  const resolvedFarmerId = farmerId ?? (selectedFarmerIds.length === 1 ? selectedFarmerIds[0] : "");
  const existingFarms = farms.filter((farm) => !resolvedFarmerId || farm.farmerId === resolvedFarmerId);
  const [farmMode, setFarmMode] = useState<"existing" | "new">(
    lockFarmId || existingFarms.length ? "existing" : "new",
  );
  const mode = lockFarmId ? "existing" : existingFarms.length ? farmMode : "new";

  function toggle(asset: AssignableAsset) {
    const key = assetKey(asset);
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (assets.length === 0) return null;

  return (
    <ActionForm action={assignCustomerAssetsToFarmAction} className="mt-4 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
      <input type="hidden" name="farmerId" value={resolvedFarmerId} />
      {lockFarmId ? <input type="hidden" name="returnFarmId" value={lockFarmId} /> : null}
      {lockFarmId ? <input type="hidden" name="farmMode" value="existing" /> : null}
      {lockFarmId ? <input type="hidden" name="farmId" value={lockFarmId} /> : null}
      <p className="text-sm font-semibold text-stone-800">Add asset to farm</p>
      <p className="text-sm text-stone-600">
        {lockFarmId
          ? "Search for a pivot or other asset on this customer, then add it to this farm."
          : "Search for a pivot or other asset, then assign it to an existing farm or create a new farm."}
      </p>
      <AssetAssignTypeahead
        assets={assets}
        selectedKeys={selectedKeys}
        onToggle={toggle}
        onClear={() => setSelectedKeys(new Set())}
        showCustomer={showCustomer}
      />
      {mixedCustomers ? (
        <p className="text-sm text-red-800">Selected assets belong to more than one customer. Choose assets from a single customer.</p>
      ) : null}
      {lockFarmId ? null : (
        <>
          <fieldset className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="farmMode"
                value="existing"
                checked={mode === "existing"}
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
                checked={mode === "new"}
                onChange={() => setFarmMode("new")}
              />
              New farm
            </label>
          </fieldset>
          {mode === "existing" ? (
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
                    {showCustomer && farm.farmerName ? `${farm.farmName} · ${farm.farmerName}` : farm.farmName}
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
        </>
      )}
      <button
        disabled={selectedAssets.length === 0 || mixedCustomers || !resolvedFarmerId}
        className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-stone-300"
      >
        Assign to farm
      </button>
    </ActionForm>
  );
}
