"use client";

import { useMemo, useState } from "react";
import { googleMapsEmbedUrl } from "@/lib/maps";

export type PivotChoice = {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  locationNote?: string | null;
};

export function PivotTypeahead({
  pivots,
  pivotId,
  onSelect,
  required,
  disabled,
}: {
  pivots: PivotChoice[];
  pivotId: string;
  onSelect: (pivot: PivotChoice | null) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  const selected = pivots.find((pivot) => pivot.id === pivotId) ?? null;
  const [text, setText] = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const matches = useMemo(() => {
    const q = text.trim().toLowerCase();
    const list = q ? pivots.filter((pivot) => pivot.name.toLowerCase().includes(q)) : pivots;
    return [...list]
      .sort((a, b) => {
        const aq = a.name.toLowerCase().startsWith(q) ? 0 : 1;
        const bq = b.name.toLowerCase().startsWith(q) ? 0 : 1;
        if (aq !== bq) return aq - bq;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 40);
  }, [pivots, text]);

  const hovered = matches.find((pivot) => pivot.id === hoveredId) ?? null;

  function choose(pivot: PivotChoice) {
    setText(pivot.name);
    setOpen(false);
    setHoveredId(null);
    onSelect(pivot);
  }

  return (
    <label className="relative block text-sm font-medium">
      Pivot
      <input type="hidden" name="pivotId" value={pivotId} />
      <input
        value={text}
        required={required && !disabled}
        disabled={disabled}
        autoComplete="off"
        placeholder={disabled ? "Select a customer first" : "Start typing a pivot name"}
        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 disabled:bg-stone-100"
        onFocus={() => {
          if (!disabled) setOpen(true);
        }}
        onChange={(event) => {
          setText(event.target.value);
          setOpen(true);
          if (pivotId) onSelect(null);
        }}
        onBlur={() => {
          window.setTimeout(() => {
            const exact = pivots.filter((pivot) => pivot.name.toLowerCase() === text.trim().toLowerCase());
            if (exact.length === 1) choose(exact[0]);
            else {
              setOpen(false);
              setHoveredId(null);
            }
          }, 180);
        }}
      />
      {open && !disabled ? (
        <div className="absolute z-20 mt-1 w-full">
          <ul
            className="max-h-64 overflow-auto rounded-lg border border-stone-200 bg-white py-1 text-sm shadow-lg"
            onMouseLeave={() => setHoveredId(null)}
          >
            {matches.length === 0 ? (
              <li className="px-3 py-2 text-stone-500">No matching pivots</li>
            ) : (
              matches.map((pivot) => (
                <li key={pivot.id}>
                  <button
                    type="button"
                    className={`block w-full px-3 py-2 text-left hover:bg-emerald-50 ${pivot.id === pivotId ? "bg-emerald-50 font-medium" : ""}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setHoveredId(pivot.id)}
                    onClick={() => choose(pivot)}
                  >
                    <span className="block">{pivot.name}</span>
                    {pivot.latitude != null && pivot.longitude != null ? (
                      <span className="block text-xs font-normal text-stone-500">
                        {pivot.latitude.toFixed(5)}, {pivot.longitude.toFixed(5)}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>
          {hovered && hovered.latitude != null && hovered.longitude != null ? (
            <div className="absolute top-0 left-full z-30 ml-2 hidden w-64 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-lg lg:block">
              <iframe
                title={`Map for ${hovered.name}`}
                src={googleMapsEmbedUrl(hovered.latitude, hovered.longitude)}
                className="h-44 w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <p className="px-2 py-1.5 text-xs text-stone-600">
                {hovered.name}
                <span className="block text-stone-500">
                  {hovered.latitude.toFixed(5)}, {hovered.longitude.toFixed(5)}
                </span>
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </label>
  );
}
