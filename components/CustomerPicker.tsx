"use client";

import { useMemo, useState } from "react";
import type { CustomerListOption } from "@/lib/qb-customers";

export function CustomerPicker({
  customers,
  value,
  onChange,
  label = "Customer",
  placeholder = "Search customers",
}: {
  customers: CustomerListOption[];
  value: string;
  onChange: (key: string) => void;
  label?: string;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const selected = customers.find((customer) => customer.key === value) ?? null;
  const matches = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const found: CustomerListOption[] = [];
    for (const customer of customers) {
      const hay = customer.label.toLowerCase();
      if (words.every((word) => hay.includes(word))) found.push(customer);
      if (found.length === 40) break;
    }
    return found;
  }, [customers, query]);

  if (selected) {
    return (
      <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-800">{label}</p>
          <p className="text-lg leading-snug text-emerald-950">{selected.label}</p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-md border border-emerald-300 bg-white px-3 py-2 text-sm text-emerald-900"
          onClick={() => {
            onChange("");
            setQuery("");
          }}
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <label className="grid gap-1 text-sm text-stone-700">
        {label}
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="h-12 rounded-xl border border-stone-300 bg-white px-3 text-base text-stone-900"
        />
      </label>
      {query.trim().length === 0 ? (
        <p className="text-sm text-stone-500">Type two or more letters of the customer name.</p>
      ) : matches.length === 0 ? (
        <p className="text-sm text-stone-500">No matching customer.</p>
      ) : (
        <ul className="max-h-64 overflow-auto rounded-xl border border-stone-200 bg-white">
          {matches.map((customer) => (
            <li key={customer.key} className="border-b border-stone-100 last:border-b-0">
              <button
                type="button"
                className="w-full px-4 py-3 text-left text-base leading-snug hover:bg-emerald-50"
                onClick={() => onChange(customer.key)}
              >
                {customer.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
