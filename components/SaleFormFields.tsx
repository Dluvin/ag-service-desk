"use client";

import { useMemo, useState } from "react";
import { FarmSelect } from "@/components/FarmSelect";
import { StoreSelect } from "@/components/StoreSelect";
import type { FarmOption } from "@/lib/farms";
import { SALE_STATUSES, SALE_STATUS_LABELS, saleDateInputValue, type SaleStatus } from "@/lib/sales";

type SaleDefaults = {
  jobLead?: string;
  status?: string;
  salesmanName?: string | null;
  salesmanUserId?: string | null;
  location?: string | null;
  contactPhone?: string | null;
  contactName?: string | null;
  notes?: string | null;
  lastContactAt?: Date | string | null;
  assetTypeSlug?: string | null;
  assetName?: string | null;
  serialNumber?: string | null;
  locationNote?: string | null;
  farmerId?: string | null;
  farmId?: string | null;
  storeId?: string | null;
};

export function SaleFormFields({
  farmers,
  farms,
  stores,
  salespeople,
  assetTypes,
  defaults,
  showStatus = true,
}: {
  farmers: { id: string; name: string }[];
  farms: FarmOption[];
  stores: { id: string; name: string }[];
  salespeople: { id: string; name: string }[];
  assetTypes: { id: string; name: string; slug: string }[];
  defaults?: SaleDefaults;
  showStatus?: boolean;
}) {
  const [farmerMode, setFarmerMode] = useState<"existing" | "new">(farmers.length ? "existing" : "new");
  const [farmerId, setFarmerId] = useState(defaults?.farmerId ?? "");
  const [farmMode, setFarmMode] = useState<"existing" | "new">("existing");
  const [salesmanUserId, setSalesmanUserId] = useState(defaults?.salesmanUserId ?? "");

  const selectedSalesperson = useMemo(
    () => salespeople.find((person) => person.id === salesmanUserId) ?? null,
    [salesmanUserId, salespeople],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Last contact date
          <input
            type="date"
            name="lastContactAt"
            defaultValue={saleDateInputValue(defaults?.lastContactAt)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        {showStatus ? (
          <label className="block text-sm font-medium">
            Status
            <select
              name="status"
              defaultValue={(defaults?.status as SaleStatus) || "LEAD"}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            >
              {SALE_STATUSES.filter((status) => status !== "COMPLETED").map((status) => (
                <option key={status} value={status}>
                  {SALE_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Salesman
          <select
            name="salesmanUserId"
            value={salesmanUserId}
            onChange={(event) => setSalesmanUserId(event.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          >
            <option value="">Other / type a name</option>
            {salespeople.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Salesman name
          <input
            name="salesmanName"
            defaultValue={defaults?.salesmanName ?? selectedSalesperson?.name ?? ""}
            key={selectedSalesperson?.id ?? "free-name"}
            placeholder="Stewart"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
      </div>

      <StoreSelect stores={stores} defaultValue={defaults?.storeId} label="Store" />

      <fieldset className="flex flex-wrap gap-4 text-sm">
        <legend className="mb-2 w-full text-sm font-medium text-stone-800">Customer</legend>
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
              setFarmMode("existing");
            }}
          />
          New customer
        </label>
      </fieldset>

      {farmerMode === "existing" ? (
        <div className="space-y-4">
          <label className="block text-sm font-medium">
            Customer
            <select
              name="farmerId"
              required
              value={farmerId}
              onChange={(event) => {
                setFarmerId(event.target.value);
                setFarmMode("existing");
              }}
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

          <fieldset className="flex flex-wrap gap-4 text-sm">
            <legend className="mb-2 w-full text-sm font-medium text-stone-800">Farm</legend>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="farmMode"
                value="existing"
                checked={farmMode === "existing"}
                onChange={() => setFarmMode("existing")}
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
                disabled={!farmerId}
              />
              New farm
            </label>
          </fieldset>
          {farmMode === "existing" ? (
            <FarmSelect
              farms={farms}
              farmerId={farmerId}
              defaultFarmId={defaults?.farmId}
              hint={
                farmerId
                  ? "Farms for this customer only. Leave Unassigned if the sale is not tied to a farm yet."
                  : "Select a customer first to choose one of their farms."
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium sm:col-span-2">
                Farm name
                <input name="farmName" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium sm:col-span-2">
                Farm location note
                <input name="farmLocation" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
              </label>
            </div>
          )}
        </div>
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
          <label className="block text-sm font-medium">
            Contact name
            <input
              name="farmerContactName"
              defaultValue={defaults?.contactName ?? ""}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium">
            Phone
            <input
              name="farmerPhone"
              defaultValue={defaults?.contactPhone ?? ""}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium sm:col-span-2">
            Email
            <input name="farmerEmail" type="email" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <p className="sm:col-span-2 text-xs text-stone-500">
            You can add a farm after the customer is created, or when you finish the sale.
          </p>
        </div>
      )}

      <label className="block text-sm font-medium">
        Job lead
        <input
          name="jobLead"
          required
          defaultValue={defaults?.jobLead ?? ""}
          placeholder="Cornell solid separator pump / 7-tower Valley"
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        />
      </label>

      <label className="block text-sm font-medium">
        Location
        <input
          name="location"
          defaultValue={defaults?.location ?? ""}
          placeholder="Waycross, GA"
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Contact name
          <input
            name="contactName"
            defaultValue={defaults?.contactName ?? ""}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm font-medium">
          Contact #
          <input
            name="contactPhone"
            defaultValue={defaults?.contactPhone ?? ""}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
      </div>

      <label className="block text-sm font-medium">
        Notes
        <textarea
          name="notes"
          rows={4}
          defaultValue={defaults?.notes ?? ""}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        />
      </label>

      <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 space-y-4">
        <p className="text-sm font-semibold text-stone-800">What you expect to sell</p>
        <p className="text-xs text-stone-500">
          When the sale is finished, Ag Desk creates this as a pivot, pump, or other asset type.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Asset type
            <select
              name="assetTypeSlug"
              defaultValue={defaults?.assetTypeSlug || assetTypes[0]?.slug || "pivots"}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            >
              {assetTypes.map((type) => (
                <option key={type.id} value={type.slug}>
                  {type.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Asset name
            <input
              name="assetName"
              defaultValue={defaults?.assetName ?? ""}
              placeholder="Defaults to job lead when finishing"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium">
            Serial number
            <input
              name="serialNumber"
              defaultValue={defaults?.serialNumber ?? ""}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium">
            Location note
            <input
              name="locationNote"
              defaultValue={defaults?.locationNote ?? ""}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
