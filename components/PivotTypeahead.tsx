"use client";

import { useMemo, useState } from "react";

export function PivotTypeahead({
  pivots,
  pivotId,
  onSelect,
  required,
  disabled,
}: {
  pivots: { id: string; name: string }[];
  pivotId: string;
  onSelect: (pivot: { id: string; name: string } | null) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  const selected = pivots.find((pivot) => pivot.id === pivotId) ?? null;
  const [text, setText] = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);

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

  function choose(pivot: { id: string; name: string }) {
    setText(pivot.name);
    setOpen(false);
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
        placeholder={disabled ? "Select a farm first" : "Start typing a pivot name"}
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
            else setOpen(false);
          }, 120);
        }}
      />
      {open && !disabled ? (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-stone-200 bg-white py-1 text-sm shadow-lg">
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-stone-500">No matching pivots</li>
          ) : (
            matches.map((pivot) => (
              <li key={pivot.id}>
                <button
                  type="button"
                  className={`block w-full px-3 py-2 text-left hover:bg-emerald-50 ${pivot.id === pivotId ? "bg-emerald-50 font-medium" : ""}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(pivot)}
                >
                  {pivot.name}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </label>
  );
}
