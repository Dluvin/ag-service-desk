"use client";

import { useState } from "react";
import { MapLocationPicker } from "@/components/MapLocationPicker";

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
  const [siteMode, setSiteMode] = useState<"existing" | "new">(
    defaultPivotId || pivots.length ? "existing" : "new",
  );
  const [farmerMode, setFarmerMode] = useState<"existing" | "new">(farmers.length && !lockedFarmerId ? "existing" : "new");

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
        <label className="block text-sm font-medium">
          Pivot
          <select
            name="pivotId"
            required={siteMode === "existing"}
            defaultValue={defaultPivotId ?? ""}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          >
            <option value="">Select a pivot</option>
            {pivots.map((pivot) => (
              <option key={pivot.id} value={pivot.id}>
                {pivot.farmerName} — {pivot.name}
              </option>
            ))}
          </select>
        </label>
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
                <label className="block text-sm font-medium">
                  Farm
                  <select name="farmerId" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2">
                    <option value="">Select farm</option>
                    {farmers.map((farmer) => (
                      <option key={farmer.id} value={farmer.id}>
                        {farmer.name}
                      </option>
                    ))}
                  </select>
                </label>
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
            <label className="block text-sm font-medium">
              Farmer / client
              <select name="farmerId" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2">
                <option value="">Select farm</option>
                {farmers.map((farmer) => (
                  <option key={farmer.id} value={farmer.id}>
                    {farmer.name}
                  </option>
                ))}
              </select>
            </label>
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
