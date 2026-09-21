"use client";

import { updateRevealVehicleStoreAction } from "@/lib/actions";

export function VehicleStoreSelect({
  vehicleId,
  storeId,
  stores,
  staffStoreName,
}: {
  vehicleId: string;
  storeId: string | null;
  stores: { id: string; name: string }[];
  staffStoreName?: string | null;
}) {
  if (stores.length === 0) return null;

  return (
    <form
      action={async (formData) => {
        await updateRevealVehicleStoreAction(formData);
      }}
      className="w-44 shrink-0"
    >
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <label className="block text-xs text-stone-600">
        Store
        <select
          name="storeId"
          defaultValue={storeId ?? ""}
          className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1 text-xs"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          <option value="">
            {staffStoreName ? `Use staff store (${staffStoreName})` : "Use staff store"}
          </option>
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
