import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pivotWhere } from "@/lib/scope";
import { canImportPivots, isShopStaff } from "@/lib/roles";
import { importAgSensePivotsAction } from "@/lib/actions";
import { syncPivotPackagesAction } from "@/lib/pivot-package-actions";
import { ActionForm } from "@/components/ActionForm";
import { PivotDirectory } from "@/components/PivotDirectory";
import { ChooseAssetTypeButton } from "@/components/ChooseAssetTypeButton";
import { ensureAssetTypes } from "@/lib/assets";

export default async function PivotsPage({
  searchParams,
}: {
  searchParams: Promise<{
    imported?: string;
    updated?: string;
    skipped?: string;
    farmers?: string;
    packagesMatched?: string;
    packagesUpdated?: string;
    packagesSkipped?: string;
    packagesError?: string;
  }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const query = await searchParams;
  const canAdd = isShopStaff(session.role);
  const canImport = canImportPivots(session.role);
  const [pivots, farmers, types] = await Promise.all([
    prisma.pivot.findMany({
      where: pivotWhere(session),
      include: {
        farmer: true,
        tickets: { where: { status: { notIn: ["COMPLETED", "CANCELLED"] } } },
        _count: { select: { notes: true } },
      },
      orderBy: { name: "asc" },
    }),
    canImport
      ? prisma.farmer.findMany({
          where: { organizationId: session.organizationId },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    canAdd ? ensureAssetTypes(session.organizationId) : Promise.resolve([]),
  ]);

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl">Pivots</h1>
          {canAdd ? (
            <ChooseAssetTypeButton types={types} />
          ) : null}
        </div>
        {query.imported || query.updated || query.skipped || query.farmers ? (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
            AgSense import finished: {query.imported ?? "0"} added, {query.updated ?? "0"} updated
            {query.farmers && query.farmers !== "0" ? `, ${query.farmers} customer(s) created` : ""}
            {query.skipped && query.skipped !== "0" ? `, ${query.skipped} skipped` : ""}.
          </p>
        ) : null}
        {query.packagesMatched || query.packagesUpdated || query.packagesSkipped ? (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
            Pivot packages: {query.packagesMatched ?? "0"} exact match(es), {query.packagesUpdated ?? "0"} pivot(s)
            updated
            {query.packagesSkipped && query.packagesSkipped !== "0"
              ? `, ${query.packagesSkipped} already linked`
              : ""}
            .
          </p>
        ) : null}
        {query.packagesError ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {query.packagesError}
          </p>
        ) : null}
        <PivotDirectory
          pivots={pivots.map((pivot) => ({
            id: pivot.id,
            name: pivot.name,
            farmerName: pivot.farmer.name,
            latitude: pivot.latitude,
            longitude: pivot.longitude,
            serialNumber: pivot.serialNumber,
            packageItem: pivot.packageItem,
            packageBrand: pivot.packageBrand,
            packageTowerCount: pivot.packageTowerCount,
            openTickets: pivot.tickets.length,
            notes: pivot._count.notes,
          }))}
        />
      </div>
      {canImport ? (
        <div id="import" className="lg:col-span-2 space-y-8">
          <div>
            <h2 className="font-display text-xl">Pivot packages</h2>
            <p className="mt-2 text-sm text-stone-600">
              Match the sprinkler-package catalog onto pivots by exact serial/item number or a unique pivot-name
              match in the package description. Ambiguous names are left alone.
            </p>
            <ActionForm action={syncPivotPackagesAction} className="mt-3">
              <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
                Sync package matches
              </button>
            </ActionForm>
          </div>
          <div>
          <h2 className="font-display text-xl">Import pivots</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-stone-600">
            <li>CSV with customer/grower, pivot name, and GPS (or a Google Maps link).</li>
            <li>AgSense device export also works if it has name, grower, and coordinates.</li>
            <li>Matching serial numbers or the same customer + pivot name update; new rows are added.</li>
          </ol>
          <p className="mt-2 text-sm">
            <a href="/agsense-pivots-template.csv" className="text-emerald-800 hover:underline">
              Download a sample CSV
            </a>
          </p>
          <ActionForm action={importAgSensePivotsAction} encType="multipart/form-data" className="mt-3 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
            <label className="block text-sm font-medium">
              AgSense file
              <input name="file" type="file" accept=".csv,.txt" required className="mt-1 w-full text-sm" />
            </label>
            <label className="block text-sm font-medium">
              Default customer if Grower is blank
              <select name="defaultFarmerId" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2">
                <option value="">None — skip rows without a grower</option>
                {farmers.map((farmer) => (
                  <option key={farmer.id} value={farmer.id}>
                    {farmer.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="createFarmers" defaultChecked className="rounded border-stone-300" />
              Create customers from new Grower names
            </label>
            <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
              Import pivots
            </button>
          </ActionForm>
          </div>
        </div>
      ) : null}
    </div>
  );
}
