"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function CatalogSearchBox({
  action,
  defaultQuery,
  placeholder,
}: {
  action: string;
  defaultQuery: string;
  placeholder: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultQuery);

  useEffect(() => {
    setQuery(defaultQuery);
  }, [defaultQuery]);

  useEffect(() => {
    const next = query.trim();
    if (next === defaultQuery.trim()) return;
    const timer = window.setTimeout(() => {
      go(action, next, router);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [action, defaultQuery, query, router]);

  return (
    <form
      className="mt-4 flex flex-wrap items-end gap-2"
      action={action}
      onSubmit={(event) => {
        event.preventDefault();
        go(action, query.trim(), router);
      }}
    >
      <label className="block min-w-56 flex-1 text-sm font-medium">
        Search catalog
        <input
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        />
      </label>
      <button type="submit" className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
        Search
      </button>
    </form>
  );
}

function go(action: string, query: string, router: ReturnType<typeof useRouter>) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  const qs = params.toString();
  router.replace(qs ? `${action}?${qs}` : action);
}
