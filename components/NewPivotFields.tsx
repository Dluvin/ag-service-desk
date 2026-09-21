"use client";

import { useState } from "react";
import { MapLocationPicker } from "@/components/MapLocationPicker";
import { FarmSelect } from "@/components/FarmSelect";
import type { FarmOption } from "@/lib/farms";

export function NewPivotFields({
  farmers,
  farms,
  mapsApiKey,
}: {
  farmers: { id: string; name: string }[];
  farms: FarmOption[];
  mapsApiKey?: string;
}) {
  const [farmerMode, setFarmerMode] = useState<"existing" | "new">(farmers.length ? "existing" : "new");
  const [farmerId, setFarmerId] = useState("");

  return (
    <div className="space-y-4">
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
            onChange={() => {
              setFarmerMode("new");
              setFarmerId("");
            }}
          />
          New customer
        </label>
      </fieldset>

      {farmerMode === "existing" ? (
        <>
          <label className="block text-sm font-medium">
            Customer
            <select
              name="farmerId"
              required
              value={farmerId}
              onChange={(event) => setFarmerId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            >
              <option value="">Select customer</option>
              {farmers.map((farmer) => (
                <option key={farmer.id} value={farmer.id}>
                  {farmer.name}
                </option>
              ))}
            </select>
          </label>
          <FarmSelect farms={farms} farmerId={farmerId} />
        </>
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
          <div className="sm:col-span-2">
            <FarmSelect
              farms={farms}
              farmerId=""
              hint="New customers start with pivots Unassigned. Create a farm on the customer page, then assign it here."
            />
          </div>
        </div>
      )}

      <label className="block text-sm font-medium">
        Pivot name
        <input name="name" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
      </label>
      <label className="block text-sm font-medium">
        Serial number
        <input name="serialNumber" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
      </label>
      <MapLocationPicker apiKey={mapsApiKey} />
      <label className="block text-sm font-medium">
        Location note
        <input name="locationNote" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
      </label>
    </div>
  );
}
