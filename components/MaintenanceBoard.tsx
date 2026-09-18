"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { startStartupInspectionAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { ListSearch } from "@/components/ListSearch";
import { FarmTypeahead } from "@/components/FarmTypeahead";

type MaintenancePivot = {
  id: string;
  name: string;
  farmerId: string;
  farmerName: string;
  serialNumber: string | null;
  status: string;
  statusLabel: string;
  inspectionId: string | null;
  ticketId: string | null;
};

export function MaintenanceBoard({
  pivots,
  canInspect,
}: {
  pivots: MaintenancePivot[];
  canInspect: boolean;
}) {
  const [query, setQuery] = useState("");
  const [farmId, setFarmId] = useState("");

  const farms = useMemo(() => {
    const seen = new Map<string, string>();
    for (const pivot of pivots) {
      if (!seen.has(pivot.farmerId)) seen.set(pivot.farmerId, pivot.farmerName);
    }
    return [...seen.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [pivots]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pivots.filter((pivot) => {
      if (farmId && pivot.farmerId !== farmId) return false;
      if (!q) return true;
      return [pivot.name, pivot.farmerName, pivot.serialNumber, pivot.statusLabel]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [farmId, pivots, query]);

  const groups = useMemo(() => {
    const byFarm = new Map<string, MaintenancePivot[]>();
    for (const pivot of matches) {
      const list = byFarm.get(pivot.farmerId) ?? [];
      list.push(pivot);
      byFarm.set(pivot.farmerId, list);
    }
    return farms
      .filter((farm) => byFarm.has(farm.id))
      .map((farm) => ({ ...farm, pivots: byFarm.get(farm.id) ?? [] }));
  }, [farms, matches]);

  return (
    <>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <FarmTypeahead
          farms={farms}
          farmerId={farmId}
          allowEmpty
          emptyLabel="All farms"
          onSelect={(farm) => setFarmId(farm?.id ?? "")}
        />
        <ListSearch
          value={query}
          onChange={setQuery}
          label="Search"
          placeholder="Pivot, farm, or serial"
          className="block text-sm font-medium"
        />
      </div>
      <p className="mt-2 text-sm text-stone-500">
        {matches.length === 0
          ? "No pivots match that farm or search."
          : `Showing ${matches.length.toLocaleString()} pivot${matches.length === 1 ? "" : "s"} in ${groups.length.toLocaleString()} farm${groups.length === 1 ? "" : "s"}.`}
      </p>
      <div className="mt-4 space-y-6">
        {groups.map((farm) => (
          <section key={farm.id} className="overflow-hidden rounded-xl border border-stone-200 bg-white">
            <h2 className="border-b border-stone-200 bg-stone-50 px-4 py-2 font-display text-lg">
              {farm.name}
              <span className="ml-2 text-sm font-sans font-normal text-stone-500">
                {farm.pivots.length} pivot{farm.pivots.length === 1 ? "" : "s"}
              </span>
            </h2>
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-2">Pivot</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {farm.pivots.map((pivot) => (
                  <tr key={pivot.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-medium">
                      {pivot.name}
                      {pivot.serialNumber ? (
                        <p className="text-xs font-normal text-stone-500">{pivot.serialNumber}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass(pivot.status)}`}
                      >
                        {pivot.statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {pivot.ticketId ? (
                        <span className="inline-flex flex-wrap justify-end gap-3">
                          <Link href={`/tickets/${pivot.ticketId}`} className="text-emerald-800 hover:underline">
                            Open ticket
                          </Link>
                          {pivot.inspectionId ? (
                            <Link href={`/startup/${pivot.inspectionId}`} className="text-stone-600 hover:underline">
                              Checklist
                            </Link>
                          ) : null}
                        </span>
                      ) : canInspect ? (
                        <ActionForm action={startStartupInspectionAction}>
                          <input type="hidden" name="pivotId" value={pivot.id} />
                          <button className="text-emerald-800 hover:underline">Start maintenance</button>
                        </ActionForm>
                      ) : pivot.inspectionId ? (
                        <Link href={`/startup/${pivot.inspectionId}`} className="text-emerald-800 hover:underline">
                          Open checklist
                        </Link>
                      ) : (
                        <span className="text-stone-400">Waiting on shop</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </>
  );
}

function statusClass(status: string) {
  if (status === "PASSED") return "bg-emerald-100 text-emerald-900";
  if (status === "FAILED") return "bg-red-100 text-red-900";
  if (status === "IN_PROGRESS") return "bg-amber-100 text-amber-950";
  return "bg-stone-100 text-stone-700";
}
