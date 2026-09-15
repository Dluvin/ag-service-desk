"use client";

import { useMemo, useState } from "react";
import { MapLocationPicker } from "@/components/MapLocationPicker";
import { FarmTypeahead } from "@/components/FarmTypeahead";

type PivotOption = { id: string; name: string; farmerName: string; farmerId: string };
type FarmerOption = { id: string; name: string };

export function NewTicketSiteFields({
  pivots,
  farmers,
  canAddFarmer,
  mapsApiKey,
  lockedFarmerId,
  defaultPivotId,
}: {
  pivots: PivotOption[];
  farmers: FarmerOption[];
  canAddFarmer: boolean;
  mapsApiKey?: string;
  lockedFarmerId?: string | null;
  defaultPivotId?: string;
}) {
  const defaultPivot = pivots.find((pivot) => pivot.id === defaultPivotId);
  const initialFarmId = lockedFarmerId || defaultPivot?.farmerId || "";
  const [siteMode, setSiteMode] = useState<"existing" | "new">(
    defaultPivotId || pivots.length ? "existing" : "new",
  );
  const [farmerMode, setFarmerMode] = useState<"existing" | "new">(
    farmers.length && !lockedFarmerId ? "existing" : "new",
  );
  const [farmerId, setFarmerId] = useState(initialFarmId);
  const [pivotId, setPivotId] = useState(defaultPivotId ?? "");

  const farmPivots = useMemo(
    () => pivots.filter((pivot) => pivot.farmerId === farmerId).sort((a, b) => a.name.localeCompare(b.name)),
    [pivots, farmerId],
  );
  const lockedFarm = farmers.find((farm) => farm.id === lockedFarmerId) ?? null;

  function selectFarm(farm: { id: string; name: string } | null) {
    setFarmerId(farm?.id ?? "");
    setPivotId("");
  }

  return (
    <div className="space-y-4">
      <fieldset className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="siteMode"
            value="existing"
            checked={siteMode === "existing"}
            onChange={() => setSiteMode("existing")}
            disabled={pivots.length === 0}
          />
          Existing pivot
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="siteMode"
            value="new"
            checked={siteMode === "new"}
            onChange={() => setSiteMode("new")}
          />
          New pivot
        </label>
      </fieldset>

      {siteMode === "existing" ? (
        <div className="space-y-4">
          {lockedFarmerId ? (
            <p className="text-sm text-stone-600">
              Farm: <span className="font-medium text-stone-800">{lockedFarm?.name ?? "Your farm"}</span>
            </p>
          ) : (
            <FarmTypeahead farms={farmers} farmerId={farmerId} onSelect={selectFarm} required />
          )}
          <label className="block text-sm font-medium">
            Pivot
            <select
              name="pivotId"
              required={siteMode === "existing"}
              value={pivotId}
              disabled={!farmerId}
              onChange={(event) => setPivotId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 disabled:bg-stone-100"
            >
              <option value="">{farmerId ? "Select a pivot" : "Select a farm first"}</option>
              {farmPivots.map((pivot) => (
                <option key={pivot.id} value={pivot.id}>
                  {pivot.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border border-stone-200 bg-stone-50 p-4">
          <p className="text-sm font-semibold text-stone-800">New pivot</p>
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
                  Existing farm
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="farmerMode"
                    value="new"
                    checked={farmerMode === "new"}
                    onChange={() => setFarmerMode("new")}
                  />
                  New farm
                </label>
              </fieldset>
              {farmerMode === "existing" ? (
                <FarmTypeahead farms={farmers} farmerId={farmerId} onSelect={selectFarm} required />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-medium sm:col-span-2">
                    Farm name
                    <input name="farmerName" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
                  </label>
                  <label className="block text-sm font-medium sm:col-span-2">
                    Address
                    <input name="farmerAddress" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
                  </label>
                  <label className="block text-sm font-medium sm:col-span-2">
                    Contact name
                    <input name="farmerContactName" placeholder="Person at the farm" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
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
            Pivot name
            <input name="pivotName" required placeholder="North Quarter Pivot" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
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
