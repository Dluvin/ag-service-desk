"use client";

import { useEffect, useState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { quickCreateTicketCatalogAction } from "@/lib/actions";

export function TicketCatalogQuickCreate({
  ticketId,
  kind,
}: {
  ticketId: string;
  kind: "part" | "labor" | "equipment";
}) {
  const [open, setOpen] = useState(false);
  const noun = kind === "part" ? "part" : kind === "labor" ? "labor item" : "equipment";
  const amountLabel = kind === "part" ? "Quantity" : "Hours";

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-100"
      >
        New {noun}
      </button>
      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`new-${kind}-title`}
            className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-4 shadow-lg"
          >
            <h3 id={`new-${kind}-title`} className="font-display text-xl">
              New {noun}
            </h3>
            <p className="mt-1 text-sm text-stone-600">
              Saves it to the catalog and logs it on this work order. You stay on this page.
            </p>
            <ActionForm action={quickCreateTicketCatalogAction} className="mt-4 space-y-3">
              <input type="hidden" name="ticketId" value={ticketId} />
              <input type="hidden" name="kind" value={kind} />
              <label className="block text-sm font-medium">
                Name
                <input
                  name="name"
                  required
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm font-medium">
                SKU / code
                <input name="sku" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium">
                  {kind === "part" ? "Price each" : "Hourly rate"}
                  <input
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                  />
                </label>
                <label className="block text-sm font-medium">
                  {amountLabel}
                  <input
                    name="amount"
                    type="number"
                    min="0.25"
                    step="0.25"
                    defaultValue="1"
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                  Save and log
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-100"
                >
                  Cancel
                </button>
              </div>
            </ActionForm>
          </div>
        </div>
      ) : null}
    </>
  );
}
