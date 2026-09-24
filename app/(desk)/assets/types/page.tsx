import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canDeleteRecords, isShopStaff, ROLES } from "@/lib/roles";
import { assetTypeHref, assetTypeSingular, ensureAssetTypes, isPivotAssetType } from "@/lib/assets";
import { createAssetTypeAction, deleteAssetTypeAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { DeleteButton } from "@/components/DeleteButton";

export default async function AssetTypesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === ROLES.FARMER) redirect("/assets");

  const types = await ensureAssetTypes(session.organizationId);
  const counts = await prisma.asset.groupBy({
    by: ["assetTypeId"],
    where: { organizationId: session.organizationId },
    _count: { _all: true },
  });
  const countByType = new Map(counts.map((row) => [row.assetTypeId, row._count._all]));
  const pivotCount = types.some(isPivotAssetType)
    ? await prisma.pivot.count({ where: { organizationId: session.organizationId } })
    : 0;

  const canAdd = isShopStaff(session.role);
  const canDelete = canDeleteRecords(session.role);

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <h1 className="font-display text-3xl">Asset types</h1>
        <p className="mt-1 text-sm text-stone-600">
          Built-in types stay per company. Pivots keep using the existing pivot list.
        </p>
        <ul className="mt-4 divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200 bg-white">
          {types.map((type) => {
            const count = isPivotAssetType(type) ? pivotCount : (countByType.get(type.id) ?? 0);
            return (
              <li key={type.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <Link href={assetTypeHref(type)} className="font-medium text-emerald-900 hover:underline">
                    {type.name}
                  </Link>
                  <p className="text-sm text-stone-600">
                    {count} {count === 1 ? assetTypeSingular(type.name).toLowerCase() : type.name.toLowerCase()}
                    {type.builtIn ? " · Built-in" : ""}
                    {isPivotAssetType(type) ? " · Existing pivot records" : ""}
                  </p>
                </div>
                {canDelete && !type.builtIn ? (
                  <DeleteButton
                    action={deleteAssetTypeAction}
                    name="assetTypeId"
                    value={type.id}
                    label="Delete type"
                    confirmText={`Delete ${type.name} and its assets? This cannot be undone.`}
                    typedMatch={type.name}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-sm">
          <Link href="/assets" className="font-semibold text-emerald-800 hover:underline">
            Back to All Assets
          </Link>
        </p>
      </div>
      {canAdd ? (
        <div className="lg:col-span-2">
          <h2 className="font-display text-xl">Add asset type</h2>
          <p className="mt-1 text-sm text-stone-600">Name a type for this company, such as Motors or Panels.</p>
          <ActionForm action={createAssetTypeAction} className="mt-3 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
            <label className="block text-sm font-medium">
              Type name
              <input name="name" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
            </label>
            <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Save type</button>
          </ActionForm>
        </div>
      ) : null}
    </div>
  );
}
