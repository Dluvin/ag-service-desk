"use client";

import { useEffect, useState } from "react";

type CatalogOption = {
  id: string;
  name: string;
  sku: string | null;
  price: number | null;
};

export function PartsPicker() {
  const [query, setQuery] = useState("");
  const [total, setTotal] = useState<number | null>(null);
  const [matches, setMatches] = useState<CatalogOption[]>([]);
  const [selected, setSelected] = useState<CatalogOption | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const params = new URLSearchParams();
      const q = query.trim();
      if (q) params.set("q", q);
      const response = await fetch(`/api/catalog-parts?${params}`, { signal: controller.signal });
      if (!response.ok) return;
      const data = (await response.json()) as { total: number; parts: CatalogOption[] };
      setTotal(data.total);
      setMatches(data.parts);
    }, qDelay(query));
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  if (total === 0) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        No catalog parts yet. Import from QuickBooks on the Parts page, or type a custom name below.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name="catalogPartId" value={selected?.id ?? ""} />
      <label className="block text-sm font-medium">
        Search parts list
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(null);
          }}
          placeholder="Type a name or SKU"
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        />
      </label>
      {selected ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
          Selected: {selected.name}
          {selected.sku ? ` · ${selected.sku}` : ""}
          {selected.price != null ? ` · $${selected.price.toFixed(2)}` : ""}
        </p>
      ) : null}
      {query.trim() && matches.length > 0 && !selected ? (
        <ul className="max-h-56 overflow-auto rounded-lg border border-stone-200 bg-white text-sm">
          {matches.map((part) => (
            <li key={part.id} className="border-b border-stone-100 last:border-0">
              <button
                type="button"
                onClick={() => {
                  setSelected(part);
                  setQuery(part.name);
                }}
                className="w-full px-3 py-2 text-left hover:bg-stone-50"
              >
                <span className="font-medium">{part.name}</span>
                {part.sku ? <span className="text-stone-500"> · {part.sku}</span> : null}
                {part.price != null ? <span className="text-stone-500"> · ${part.price.toFixed(2)}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {query.trim() && matches.length === 0 && total !== null ? (
        <p className="text-xs text-stone-500">No catalog match. Use a custom name below.</p>
      ) : null}
      {!query.trim() && total != null && total > 0 ? (
        <p className="text-xs text-stone-500">{total.toLocaleString()} parts in catalog. Type to search.</p>
      ) : null}
    </div>
  );
}

function qDelay(query: string) {
  return query.trim() ? 200 : 0;
}
