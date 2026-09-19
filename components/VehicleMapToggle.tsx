"use client";

import { toggleRevealVehicleMapAction } from "@/lib/actions";

export function VehicleMapToggle({
  vehicleId,
  showOnMap,
}: {
  vehicleId: string;
  showOnMap: boolean;
}) {
  return (
    <form
      action={async (formData) => {
        await toggleRevealVehicleMapAction(formData);
      }}
      className="shrink-0"
    >
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <input type="hidden" name="showOnMap" value={showOnMap ? "0" : "1"} />
      <label className="flex cursor-pointer items-center gap-2 text-xs text-stone-600">
        <input
          type="checkbox"
          defaultChecked={showOnMap}
          className="size-4 rounded border-stone-300 text-emerald-800"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        />
        Show on maps
      </label>
    </form>
  );
}
