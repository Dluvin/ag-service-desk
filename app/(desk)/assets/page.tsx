import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assetWhere, pivotWhere } from "@/lib/scope";
import { isShopStaff } from "@/lib/roles";
import {
  assetToUnifiedRow,
  assetTypeHref,
  assetTypeNewHref,
  assetTypeSingular,
  ensureAssetTypes,
  isPivotAssetType,
  pivotToUnifiedRow,
} from "@/lib/assets";
import { AssetDirectory } from "@/components/AssetDirectory";

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const query = await searchParams;
  const types = await ensureAssetTypes(session.organizationId);
  const filterSlug = query.type?.trim() || "";
  const selected = filterSlug ? types.find((type) => type.slug === filterSlug) : null;
  if (filterSlug && !selected) notFound();

  const pivotType = types.find(isPivotAssetType);
  const includePivots = !selected || (pivotType != null && selected.slug === pivotType.slug);
  const includeGeneric = !selected || !isPivotAssetType(selected);

  const [pivots, assets] = await Promise.all([
    includePivots
      ? prisma.pivot.findMany({
          where: pivotWhere(session),
          include: { farmer: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    includeGeneric
      ? prisma.asset.findMany({
          where: {
            ...assetWhere(session),
            ...(selected && !isPivotAssetType(selected) ? { assetTypeId: selected.id } : {}),
          },
          include: { farmer: true, assetType: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const rows = [
    ...pivots.map((pivot) => pivotToUnifiedRow(pivot, pivotType ?? { name: "Pivots", slug: "pivots" })),
    ...assets.map(assetToUnifiedRow),
  ].sort((a, b) => a.name.localeCompare(b.name));

  const canAdd = isShopStaff(session.role);
  const title = selected ? selected.name : "All assets";

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-stone-600">
            {selected
              ? selected.kind === "PIVOT"
                ? "Existing pivot records stay on the Pivots list and in this filter."
                : `${selected.name} for this company.`
              : "Pivots, wells, pumps, generators, and any types you add."}
          </p>
        </div>
        {canAdd ? (
          selected ? (
            <Link
              href={assetTypeNewHref(selected)}
              className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white"
            >
              Add {assetTypeSingular(selected.name).toLowerCase()}
            </Link>
          ) : (
            <Link href="/assets/types" className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800">
              Manage types
            </Link>
          )
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Asset type">
        <Link
          href="/assets"
          role="tab"
          aria-selected={!selected}
          className={`rounded-full px-3 py-1.5 text-sm ${
            selected ? "border border-stone-300 bg-white text-stone-700" : "bg-emerald-800 text-white"
          }`}
        >
          All
        </Link>
        {types.map((type) => {
          const active = selected?.slug === type.slug;
          return (
            <Link
              key={type.id}
              href={assetTypeHref(type)}
              role="tab"
              aria-selected={active}
              className={`rounded-full px-3 py-1.5 text-sm ${
                active ? "bg-emerald-800 text-white" : "border border-stone-300 bg-white text-stone-700"
              }`}
            >
              {type.name}
            </Link>
          );
        })}
      </div>

      {selected && isPivotAssetType(selected) ? (
        <p className="mt-4 text-sm">
          <Link href="/pivots" className="font-semibold text-emerald-800 hover:underline">
            Pivot directory and import
          </Link>
        </p>
      ) : null}

      {!selected && canAdd ? (
        <p className="mt-4 text-sm text-stone-600">
          Add{" "}
          {types.map((type, index) => (
            <span key={type.id}>
              {index > 0 ? (index === types.length - 1 ? ", or " : ", ") : ""}
              <Link href={assetTypeNewHref(type)} className="font-semibold text-emerald-800 hover:underline">
                {assetTypeSingular(type.name).toLowerCase()}
              </Link>
            </span>
          ))}
          .
        </p>
      ) : null}

      <AssetDirectory assets={rows} />
    </div>
  );
}
