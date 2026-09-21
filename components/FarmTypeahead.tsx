"use client";

import { useMemo, useState } from "react";

export function FarmTypeahead({
  farms,
  farmerId,
  onSelect,
  required,
  allowEmpty,
  emptyLabel = "All customers",
}: {
  farms: { id: string; name: string }[];
  farmerId: string;
  onSelect: (farm: { id: string; name: string } | null) => void;
  required?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
}) {
  const selected = farms.find((farm) => farm.id === farmerId) ?? null;
  const [text, setText] = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const q = text.trim().toLowerCase();
    const list = q
      ? farms.filter((farm) => farm.name.toLowerCase().includes(q))
      : farms;
    return [...list]
      .sort((a, b) => {
        const aq = a.name.toLowerCase().startsWith(q) ? 0 : 1;
        const bq = b.name.toLowerCase().startsWith(q) ? 0 : 1;
        if (aq !== bq) return aq - bq;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 30);
  }, [farms, text]);

  function choose(farm: { id: string; name: string } | null) {
    setText(farm?.name ?? "");
    setOpen(false);
    onSelect(farm);
  }

  return (
    <label className="relative block text-sm font-medium">
      Customer
      <input type="hidden" name="farmerId" value={farmerId} />
      <input
        value={text}
        required={required}
        autoComplete="off"
        placeholder="Start typing a customer name"
        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setText(event.target.value);
          setOpen(true);
          if (farmerId) onSelect(null);
        }}
        onBlur={() => {
          window.setTimeout(() => {
            const exact = farms.filter((farm) => farm.name.toLowerCase() === text.trim().toLowerCase());
            if (exact.length === 1) choose(exact[0]);
            else if (allowEmpty && !text.trim()) choose(null);
            else setOpen(false);
          }, 120);
        }}
      />
      {open ? (
        <ul className="absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-stone-200 bg-white py-1 text-sm shadow-lg">
          {allowEmpty && !text.trim() ? (
            <li>
              <button
                type="button"
                className={`block w-full px-3 py-2 text-left hover:bg-emerald-50 ${!farmerId ? "bg-emerald-50 font-medium" : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(null)}
              >
                {emptyLabel}
              </button>
            </li>
          ) : null}
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-stone-500">No matching customers</li>
          ) : (
            matches.map((farm) => (
              <li key={farm.id}>
                <button
                  type="button"
                  className={`block w-full px-3 py-2 text-left hover:bg-emerald-50 ${farm.id === farmerId ? "bg-emerald-50 font-medium" : ""}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(farm)}
                >
                  {farm.name}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </label>
  );
}
