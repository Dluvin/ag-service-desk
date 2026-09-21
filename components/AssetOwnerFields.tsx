"use client";

import { useState } from "react";
import { FarmSelect } from "@/components/FarmSelect";
import type { FarmOption } from "@/lib/farms";

export function AssetOwnerFields({
  farmers,
  farms,
  defaultFarmerId,
  defaultFarmId,
}: {
  farmers: { id: string; name: string }[];
  farms: FarmOption[];
  defaultFarmerId: string;
  defaultFarmId?: string | null;
}) {
  const [farmerId, setFarmerId] = useState(defaultFarmerId);

  return (
    <>
      <label className="block text-sm font-medium">
        Customer
        <select
          name="farmerId"
          value={farmerId}
          onChange={(event) => setFarmerId(event.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        >
          {farmers.map((farmer) => (
            <option key={farmer.id} value={farmer.id}>
              {farmer.name}
            </option>
          ))}
        </select>
      </label>
      <FarmSelect farms={farms} farmerId={farmerId} defaultFarmId={farmerId === defaultFarmerId ? defaultFarmId : null} />
    </>
  );
}
