"use client";

import { Fragment, useMemo, useState } from "react";
import { formatPackageMoney, packageSearchText, type PivotPackage } from "@/lib/pivot-packages";

const PAGE_SIZE = 80;

function Detail({ pkg }: { pkg: PivotPackage }) {
  const rows = [
    ["Quantity", [pkg.qty, pkg.uom].filter(Boolean).join(" ")],
    ["Preferred vendor", pkg.vendor],
    ["MPN", pkg.mpn],
    ["Barcode", pkg.barcode],
    ["Reference", pkg.reference],
  ].filter(([, value]) => value);

  if (!rows.length) return null;

  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs uppercase tracking-wide text-stone-500">{label}</dt>
          <dd className="text-sm text-stone-800">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Description({ pkg }: { pkg: PivotPackage }) {
  return (
    <div>
      <p>{pkg.description}</p>
      {pkg.purchaseDescription ? (
        <p className="mt-1 text-sm text-stone-600">
          <span className="font-medium text-stone-500">Purchase: </span>
          {pkg.purchaseDescription}
        </p>
      ) : null}
    </div>
  );
}

export function PivotPackageSearch({
  packages,
  initialItem = "",
}: {
  packages: PivotPackage[];
  initialItem?: string;
}) {
  const opened = packages.find((pkg) => pkg.item.toLowerCase() === initialItem.trim().toLowerCase())?.item ?? "";
  const [query, setQuery] = useState(opened || initialItem);
  const [shown, setShown] = useState(PAGE_SIZE);
  const [openItem, setOpenItem] = useState<string | null>(opened || null);
  const indexed = useMemo(() => packages.map((pkg) => ({ pkg, hay: packageSearchText(pkg) })), [packages]);
  const matches = useMemo(() => {
    const tokens = query
      .toLowerCase()
      .replace(/\$/g, "")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);
    if (!tokens.length) return [];
    return indexed.filter((row) => tokens.every((token) => row.hay.includes(token))).map((row) => row.pkg);
  }, [indexed, query]);
  const visible = matches.slice(0, shown);
  const trimmed = query.trim();

  function onQuery(value: string) {
    setQuery(value);
    setShown(PAGE_SIZE);
    setOpenItem(null);
  }

  return (
    <div className="grid gap-4">
      <label className="grid gap-1 text-sm font-medium text-stone-700">
        Search packages
        <input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Item, farm, tower, vendor, description, cost, or price"
          autoFocus
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-base font-normal text-stone-900 outline-none ring-emerald-800 focus:ring-2"
        />
      </label>
      <p className="text-sm text-stone-600">
        {trimmed
          ? `${matches.length.toLocaleString()} match${matches.length === 1 ? "" : "es"}`
          : `${packages.length.toLocaleString()} packages. Every field is included, and partial words match.`}
        {trimmed && matches.length > visible.length ? ` · showing ${visible.length.toLocaleString()}` : ""}
      </p>
      {!trimmed ? (
        <p className="rounded-xl border border-stone-200 bg-white p-6 text-stone-600">
          Type part of an item number, description, vendor, cost, or price. Separate words to narrow the list.
        </p>
      ) : matches.length === 0 ? (
        <p className="rounded-xl border border-stone-200 bg-white p-6 text-stone-600">No packages match that search.</p>
      ) : (
        <>
          <div className="table-freeze hidden rounded-xl border border-stone-200 bg-white md:block">
            <table className="table-grid">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Description</th>
                  <th className="num">Cost</th>
                  <th className="num">Price</th>
                  <th>Vendor</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((pkg) => {
                  const open = openItem === pkg.item;
                  return (
                    <Fragment key={pkg.item}>
                      <tr className={open ? "bg-emerald-50" : undefined}>
                        <td className="whitespace-nowrap font-medium">
                          <button
                            type="button"
                            className="text-left text-emerald-900 hover:underline"
                            aria-expanded={open}
                            onClick={() => setOpenItem(open ? null : pkg.item)}
                          >
                            {pkg.item}
                          </button>
                        </td>
                        <td>
                          <Description pkg={pkg} />
                        </td>
                        <td className="num">{formatPackageMoney(pkg.cost)}</td>
                        <td className="num">{formatPackageMoney(pkg.price)}</td>
                        <td>{pkg.vendor || "—"}</td>
                      </tr>
                      {open ? (
                        <tr className="bg-emerald-50">
                          <td colSpan={5}>
                            <Detail pkg={pkg} />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ul className="grid gap-3 md:hidden">
            {visible.map((pkg) => {
              const open = openItem === pkg.item;
              return (
                <li key={pkg.item} className="rounded-xl border border-stone-200 bg-white p-4">
                  <button
                    type="button"
                    className="text-left font-medium text-emerald-900"
                    aria-expanded={open}
                    onClick={() => setOpenItem(open ? null : pkg.item)}
                  >
                    {pkg.item}
                  </button>
                  <div className="mt-2">
                    <Description pkg={pkg} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-stone-500">Cost</dt>
                      <dd>{formatPackageMoney(pkg.cost)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-stone-500">Price</dt>
                      <dd>{formatPackageMoney(pkg.price)}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs uppercase tracking-wide text-stone-500">Vendor</dt>
                      <dd>{pkg.vendor || "—"}</dd>
                    </div>
                  </dl>
                  {open ? (
                    <div className="mt-3 border-t border-stone-200 pt-3">
                      <Detail pkg={pkg} />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {matches.length > visible.length ? (
            <button
              type="button"
              className="justify-self-start rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm text-emerald-900 hover:bg-stone-50"
              onClick={() => setShown((count) => count + PAGE_SIZE)}
            >
              Show more
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
