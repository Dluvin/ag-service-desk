"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { assetTypeNewHref, assetTypeSingular } from "@/lib/assets";

export type AssetTypeChoice = {
  name: string;
  slug: string;
  kind: string;
};

export function ChooseAssetTypeButton({
  types,
  label = "Add asset",
  className = "rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white",
}: {
  types: AssetTypeChoice[];
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {label}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4" role="presentation" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id={titleId} className="font-display text-xl">
              Choose asset type
            </h2>
            <p className="mt-1 text-sm text-stone-600">Pivots are the usual choice. Pick wells, pumps, or another type if that is the job.</p>
            <ul className="mt-4 grid gap-2">
              {types.map((type) => (
                <li key={type.slug}>
                  <Link
                    href={assetTypeNewHref(type)}
                    className="block rounded-lg border border-stone-200 px-4 py-3 text-sm font-semibold text-emerald-900 hover:border-emerald-700 hover:bg-emerald-50"
                    onClick={() => setOpen(false)}
                  >
                    {assetTypeSingular(type.name)}
                  </Link>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-4 text-sm font-medium text-stone-600 hover:underline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
