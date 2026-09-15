"use client";

import { useMemo, useState } from "react";

type CatalogOption = {
  id: string;
  name: string;
  sku: string | null;
  price: number | null;
};

export function PartsPicker({ parts }: { parts: CatalogOption[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return parts;
    return parts.filter(
      (part) =>
        part.name.toLowerCase().includes(q) ||
        (part.sku && part.sku.toLowerCase().includes(q)),
    );
  }, [parts, query]);

  if (parts.length === 0) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        No catalog parts yet. Import from QuickBooks on the Parts page, or type a custom name below.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">
        Search parts list
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name or SKU"
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        />
      </label>
      <label className="block text-sm font-medium">
        Catalog part
        <select name="catalogPartId" defaultValue="" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2">
          <option value="">Custom / not in list</option>
          {filtered.slice(0, 120).map((part) => (
            <option key={part.id} value={part.id}>
              {part.name}
              {part.sku ? ` · ${part.sku}` : ""}
              {part.price != null ? ` · $${part.price.toFixed(2)}` : ""}
            </option>
          ))}
        </select>
      </label>
      {filtered.length === 0 ? (
        <p className="text-xs text-stone-500">No catalog match. Use a custom name below.</p>
      ) : null}
    </div>
  );
}
