"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/I18nProvider";

type CatalogOption = {
  id: string;
  name: string;
  sku: string | null;
  rate: number | null;
};

export function LaborPicker() {
  const t = useT();
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
      const response = await fetch(`/api/catalog-labor?${params}`, { signal: controller.signal });
      if (!response.ok) return;
      const data = (await response.json()) as { total: number; items: CatalogOption[] };
      setTotal(data.total);
      setMatches(data.items);
    }, query.trim() ? 200 : 0);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  return (
    <div className="space-y-2">
      <input type="hidden" name="catalogLaborId" value={selected?.id ?? ""} />
      <label className="block text-sm font-medium">
        {t("catalog.searchLabor")}
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(null);
          }}
          placeholder={t("catalog.placeholderCode")}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        />
      </label>
      {selected ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
          {t("catalog.selected", { name: selected.name })}
          {selected.sku ? ` · ${selected.sku}` : ""}
          {selected.rate != null ? ` · $${selected.rate.toFixed(2)}/hr` : ""}
        </p>
      ) : null}
      {query.trim() && matches.length > 0 && !selected ? (
        <ul className="max-h-56 overflow-auto rounded-lg border border-stone-200 bg-white text-sm">
          {matches.map((item) => (
            <li key={item.id} className="border-b border-stone-100 last:border-0">
              <button
                type="button"
                onClick={() => {
                  setSelected(item);
                  setQuery(item.name);
                }}
                className="w-full px-3 py-2 text-left hover:bg-stone-50"
              >
                <span className="font-medium">{item.name}</span>
                {item.sku ? <span className="text-stone-500"> · {item.sku}</span> : null}
                {item.rate != null ? <span className="text-stone-500"> · ${item.rate.toFixed(2)}/hr</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {query.trim() && matches.length === 0 && total !== null ? (
        <p className="text-xs text-stone-500">{t("catalog.noMatch")}</p>
      ) : null}
      {!query.trim() && total != null && total > 0 ? (
        <p className="text-xs text-stone-500">{t("catalog.laborCount", { count: total.toLocaleString() })}</p>
      ) : null}
    </div>
  );
}
