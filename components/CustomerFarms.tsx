"use client";

import { useState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { DeleteButton } from "@/components/DeleteButton";
import { createFarmAction, deleteFarmAction, updateFarmAction } from "@/lib/actions";
import { farmAssignmentLabel } from "@/lib/farms";

type FarmRecord = {
  id: string;
  name: string;
  location: string | null;
  farmerId: string;
  assignments: { startYear: number; endYear: number | null; farmerName: string }[];
};

export function CustomerFarms({
  farmerId,
  farms,
  customers,
  canEdit,
  canDelete,
}: {
  farmerId: string;
  farms: FarmRecord[];
  customers: { id: string; name: string }[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [farmsOpen, setFarmsOpen] = useState(false);
  const [addFarmOpen, setAddFarmOpen] = useState(false);

  return (
    <section className="mt-8">
      <button
        type="button"
        onClick={() => setFarmsOpen((open) => !open)}
        aria-expanded={farmsOpen}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <h2 className="font-display text-xl">Farms ({farms.length})</h2>
        <span className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium">
          {farmsOpen ? "Hide" : "Show"}
        </span>
      </button>
      {farmsOpen ? (
        <>
          <p className="mt-2 text-sm text-stone-600">
            A farm is a physical site. Assets on a farm go with that farm if you move it to another
            customer. Assets labeled Unassigned stay with this customer. To assign existing assets,
            select them in Assets by farm below and use Add to farm.
          </p>
          {farms.length ? (
            <ul className="mt-3 space-y-3">
              {farms.map((farm) => (
                <li key={farm.id} className="rounded-xl border border-stone-200 bg-white p-4">
                  {canEdit ? (
                    <>
                      <ActionForm action={updateFarmAction} className="space-y-3">
                        <input type="hidden" name="farmId" value={farm.id} />
                        <label className="block text-sm font-medium">
                          Farm name
                          <input
                            name="name"
                            required
                            defaultValue={farm.name}
                            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                          />
                        </label>
                        <label className="block text-sm font-medium">
                          Location
                          <input
                            name="location"
                            defaultValue={farm.location ?? ""}
                            placeholder="Optional address or field note"
                            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                          />
                        </label>
                        <label className="block text-sm font-medium">
                          Current customer
                          <select
                            name="farmerId"
                            defaultValue={farm.farmerId}
                            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                          >
                            {customers.map((customer) => (
                              <option key={customer.id} value={customer.id}>
                                {customer.name}
                              </option>
                            ))}
                          </select>
                          <span className="mt-1 block text-xs font-normal text-stone-500">
                            Changing the customer moves this farm and every asset currently on it. The
                            farm is not deleted. Unassigned assets stay with the previous customer.
                          </span>
                        </label>
                        <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
                          Save farm
                        </button>
                      </ActionForm>
                      {farm.assignments.length ? (
                        <p className="mt-3 text-xs text-stone-500">
                          Ownership: {farm.assignments.map(farmAssignmentLabel).join(" · ")}
                        </p>
                      ) : null}
                      {canDelete ? (
                        <div className="mt-3">
                          <DeleteButton
                            action={deleteFarmAction}
                            name="farmId"
                            value={farm.id}
                            label="Delete farm"
                            confirmText={`Delete ${farm.name}? Assets on it stay with the customer and become Unassigned.`}
                          />
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <p className="font-medium">{farm.name}</p>
                      {farm.location ? <p className="text-sm text-stone-600">{farm.location}</p> : null}
                      {farm.assignments.length ? (
                        <p className="mt-1 text-xs text-stone-500">
                          Ownership: {farm.assignments.map(farmAssignmentLabel).join(" · ")}
                        </p>
                      ) : null}
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-stone-600">No farms on this customer yet.</p>
          )}
        </>
      ) : null}
      {canEdit ? (
        <div className="mt-3 rounded-xl border border-stone-200 bg-white">
          <button
            type="button"
            onClick={() => setAddFarmOpen((open) => !open)}
            aria-expanded={addFarmOpen}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <p className="text-sm font-semibold text-stone-800">Add farm</p>
            <span className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium">
              {addFarmOpen ? "Hide" : "Show"}
            </span>
          </button>
          {addFarmOpen ? (
            <ActionForm action={createFarmAction} className="space-y-3 border-t border-stone-200 p-4">
              <input type="hidden" name="farmerId" value={farmerId} />
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
              <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Save farm</button>
            </ActionForm>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
