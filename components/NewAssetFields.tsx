"use client";

import { useState } from "react";
import { MapLocationPicker } from "@/components/MapLocationPicker";

export function NewAssetFields({
  farmers,
  mapsApiKey,
  nameLabel,
}: {
  farmers: { id: string; name: string }[];
  mapsApiKey?: string;
  nameLabel: string;
}) {
  const [farmerMode, setFarmerMode] = useState<"existing" | "new">(farmers.length ? "existing" : "new");

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
            onChange={() => setFarmerMode("new")}
          />
          New customer
        </label>
      </fieldset>

      {farmerMode === "existing" ? (
        <label className="block text-sm font-medium">
          Customer
          <select name="farmerId" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2">
            <option value="">Select customer</option>
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

      <label className="block text-sm font-medium">
        {nameLabel}
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
      <label className="block text-sm font-medium">
        Notes
        <textarea name="notes" rows={3} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
      </label>
    </div>
  );
}
