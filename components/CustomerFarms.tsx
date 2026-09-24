"use client";

import { useState } from "react";
import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { DeleteButton } from "@/components/DeleteButton";
import { createFarmAction, deleteFarmAction, updateFarmAction } from "@/lib/actions";
import { useT } from "@/components/I18nProvider";

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
  const t = useT();
  const [farmsOpen, setFarmsOpen] = useState(true);
  const [addFarmOpen, setAddFarmOpen] = useState(false);

  return (
    <section className="mt-8 space-y-3">
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <button
        type="button"
        onClick={() => setFarmsOpen((open) => !open)}
        aria-expanded={farmsOpen}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <h2 className="font-display text-xl">{t("farms.countTitle", { count: farms.length })}</h2>
        <span className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium">
          {farmsOpen ? t("common.hide") : t("common.show")}
        </span>
      </button>
      {farmsOpen ? (
        <div className="border-t border-stone-200 p-4">
          <p className="text-sm text-stone-600">
            {t("farms.help")}
          </p>
          {farms.length ? (
            <ul className="mt-3 space-y-3">
              {farms.map((farm) => (
                <li key={farm.id} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                  {canEdit ? (
                    <>
                      <p className="mb-3">
                        <Link href={`/farms/${farm.id}`} className="font-semibold text-emerald-900 hover:underline">
                          {t("farms.open", { name: farm.name })}
                        </Link>
                      </p>
                      <ActionForm action={updateFarmAction} className="space-y-3">
                        <input type="hidden" name="farmId" value={farm.id} />
                        <label className="block text-sm font-medium">
                          {t("farms.name")}
                          <input
                            name="name"
                            required
                            defaultValue={farm.name}
                            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                          />
                        </label>
                        <label className="block text-sm font-medium">
                          {t("common.location")}
                          <input
                            name="location"
                            defaultValue={farm.location ?? ""}
                            placeholder={t("farms.locationPlaceholder")}
                            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                          />
                        </label>
                        <label className="block text-sm font-medium">
                          {t("farms.currentCustomer")}
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
                            {t("farms.moveHint")}
                          </span>
                        </label>
                        <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
                          {t("farms.save")}
                        </button>
                      </ActionForm>
                      {farm.assignments.length ? (
                        <p className="mt-3 text-xs text-stone-500">
                          {t("farms.ownership", {
                            text: farm.assignments
                              .map((assignment) =>
                                t("farms.span", {
                                  start: assignment.startYear,
                                  end: assignment.endYear ?? t("common.present"),
                                  name: assignment.farmerName,
                                }),
                              )
                              .join(" · "),
                          })}
                        </p>
                      ) : null}
                      {canDelete ? (
                        <div className="mt-3">
                          <DeleteButton
                            action={deleteFarmAction}
                            name="farmId"
                            value={farm.id}
                            label={t("farms.delete")}
                            confirmText={t("farms.deleteConfirm", { name: farm.name })}
                            typedMatch={farm.name}
                          />
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <p className="font-medium">
                        <Link href={`/farms/${farm.id}`} className="text-emerald-900 hover:underline">
                          {farm.name}
                        </Link>
                      </p>
                      {farm.location ? <p className="text-sm text-stone-600">{farm.location}</p> : null}
                      {farm.assignments.length ? (
                        <p className="mt-1 text-xs text-stone-500">
                          {t("farms.ownership", {
                            text: farm.assignments
                              .map((assignment) =>
                                t("farms.span", {
                                  start: assignment.startYear,
                                  end: assignment.endYear ?? t("common.present"),
                                  name: assignment.farmerName,
                                }),
                              )
                              .join(" · "),
                          })}
                        </p>
                      ) : null}
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-stone-600">{t("farms.noneOnCustomer")}</p>
          )}
        </div>
      ) : null}
      </div>
      {canEdit ? (
        <div className="rounded-xl border border-stone-200 bg-white">
          <button
            type="button"
            onClick={() => setAddFarmOpen((open) => !open)}
            aria-expanded={addFarmOpen}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <p className="text-sm font-semibold text-stone-800">{t("farms.add")}</p>
            <span className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium">
              {addFarmOpen ? t("common.hide") : t("common.show")}
            </span>
          </button>
          {addFarmOpen ? (
            <ActionForm action={createFarmAction} className="space-y-3 border-t border-stone-200 p-4">
              <input type="hidden" name="farmerId" value={farmerId} />
              <label className="block text-sm font-medium">
                {t("farms.name")}
                <input name="name" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium">
                {t("common.location")}
                <input
                  name="location"
                  placeholder={t("farms.locationPlaceholder")}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </label>
              <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">{t("farms.save")}</button>
            </ActionForm>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
