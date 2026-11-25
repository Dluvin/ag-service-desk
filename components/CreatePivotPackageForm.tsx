"use client";

import { ActionForm } from "@/components/ActionForm";
import { createPivotPackageAction } from "@/lib/pivot-package-actions";

export function CreatePivotPackageForm() {
  return (
    <ActionForm action={createPivotPackageAction} className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium text-stone-700">Package type</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="radio" name="kind" value="SPRINKLER" defaultChecked className="accent-emerald-800" />
            Sprinkler package
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="radio" name="kind" value="PIVOT" className="accent-emerald-800" />
            Pivot package
          </label>
        </div>
      </fieldset>
      <label className="block text-sm font-medium">
        Item number
        <input name="item" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
      </label>
      <label className="block text-sm font-medium">
        Description
        <input
          name="description"
          required
          placeholder="Farm / customer, towers, length…"
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        />
      </label>
      <label className="block text-sm font-medium">
        Purchase description
        <input name="purchaseDescription" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium">
          Cost
          <input name="cost" type="number" step="0.01" min="0" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
        </label>
        <label className="block text-sm font-medium">
          Price
          <input name="price" type="number" step="0.01" min="0" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
        </label>
      </div>
      <label className="block text-sm font-medium">
        Preferred vendor
        <input name="vendor" placeholder="VALMONT INDUSTRIES INC." className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium">
          MPN
          <input name="mpn" placeholder="Defaults to item #" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
        </label>
        <label className="block text-sm font-medium">
          Barcode
          <input name="barcode" placeholder="Defaults to item #" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium">
          Qty
          <input name="qty" defaultValue="0" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
        </label>
        <label className="block text-sm font-medium">
          UOM
          <input name="uom" defaultValue="each (ea)" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
        </label>
      </div>
      <label className="block text-sm font-medium">
        Reference
        <input name="reference" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
      </label>
      <button type="submit" className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
        Create package
      </button>
    </ActionForm>
  );
}
