import Link from "next/link";
import { STORE_ALL, STORE_NONE, type StoreOption } from "@/lib/stores";

export function StoreFilter({
  stores,
  selected,
  pathname,
  extra,
}: {
  stores: StoreOption[];
  selected: string;
  pathname: string;
  extra?: Record<string, string | undefined>;
}) {
  if (stores.length === 0) return null;

  const links = [
    { id: STORE_ALL, name: "All stores" },
    ...stores,
    { id: STORE_NONE, name: "No store" },
  ];

  function hrefFor(storeId: string) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(extra ?? {})) {
      if (value) params.set(key, value);
    }
    if (storeId !== STORE_ALL) params.set("store", storeId);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {links.map((link) => {
        const href = hrefFor(link.id);
        const active = selected === link.id;
        return (
          <Link
            key={link.id}
            href={href}
            className={
              active
                ? "rounded-full bg-emerald-800 px-3 py-1 text-sm font-semibold text-white"
                : "rounded-full border border-stone-300 bg-white px-3 py-1 text-sm text-stone-700 hover:border-emerald-700"
            }
          >
            {link.name}
          </Link>
        );
      })}
    </div>
  );
}
