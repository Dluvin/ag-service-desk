import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES, canDeleteRecords } from "@/lib/roles";
import { homePath } from "@/lib/home";
import { ensureAssetTypes, assetTypeSingular } from "@/lib/assets";
import { deleteSaleAction, finishSaleAction, updateSaleAction } from "@/lib/sale-actions";
import { ActionForm } from "@/components/ActionForm";
import { SaleFormFields } from "@/components/SaleFormFields";
import { MapLocationPicker } from "@/components/MapLocationPicker";
import { FarmSelect } from "@/components/FarmSelect";
import { DeleteButton } from "@/components/DeleteButton";
import { formatSaleDate, isSaleFinished, saleStatusLabel } from "@/lib/sales";

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === ROLES.FARMER) redirect(homePath(session.role));

  const { id } = await params;
  const sale = await prisma.sale.findFirst({
    where: { id, organizationId: session.organizationId },
    include: {
      farmer: { select: { id: true, name: true } },
      farm: { select: { id: true, name: true } },
      store: { select: { name: true } },
      salesmanUser: { select: { id: true, name: true } },
      pivot: { select: { id: true, name: true } },
      asset: { select: { id: true, name: true, assetType: { select: { name: true } } } },
    },
  });
  if (!sale) notFound();

  const finished = isSaleFinished(sale.status) || Boolean(sale.pivotId || sale.assetId);
  const [farmers, farms, stores, salespeople, assetTypes] = await Promise.all([
    prisma.farmer.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.farm.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, farmerId: true },
    }),
    prisma.store.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: { organizationId: session.organizationId, role: { not: ROLES.FARMER } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    ensureAssetTypes(session.organizationId),
  ]);

  const expectedType =
    assetTypes.find((type) => type.slug === sale.assetTypeSlug) ??
    assetTypes.find((type) => type.slug === "pivots") ??
    assetTypes[0];

  return (
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <p className="text-sm">
          <Link href="/sales" className="text-emerald-800 hover:underline">
            Sales
          </Link>
        </p>
        <h1 className="font-display mt-1 text-3xl">{sale.jobLead}</h1>
        <p className="mt-1 text-sm text-stone-600">
          {saleStatusLabel(sale.status)}
          {sale.lastContactAt ? ` · Last contact ${formatSaleDate(sale.lastContactAt)}` : ""}
          {sale.store?.name ? ` · ${sale.store.name}` : ""}
        </p>

        {finished ? (
          <div className="mt-6 space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-6">
            <p className="text-sm font-semibold text-emerald-950">Sale finished</p>
            <dl className="grid gap-2 text-sm text-stone-700">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">Customer</dt>
                <dd>
                  {sale.farmer ? (
                    <Link href={`/farmers/${sale.farmer.id}`} className="font-medium text-emerald-900 hover:underline">
                      {sale.farmer.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">Asset created</dt>
                <dd>
                  {sale.pivot ? (
                    <Link href={`/pivots/${sale.pivot.id}`} className="font-medium text-emerald-900 hover:underline">
                      Pivot · {sale.pivot.name}
                    </Link>
                  ) : sale.asset ? (
                    <Link href={`/assets/${sale.asset.id}`} className="font-medium text-emerald-900 hover:underline">
                      {sale.asset.assetType.name} · {sale.asset.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">Notes</dt>
                <dd className="whitespace-pre-wrap">{sale.notes || "—"}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <ActionForm action={updateSaleAction} className="mt-6 space-y-4 rounded-xl border border-stone-200 bg-white p-6">
            <input type="hidden" name="saleId" value={sale.id} />
            <SaleFormFields
              farmers={farmers}
              farms={farms}
              stores={stores}
              salespeople={salespeople}
              assetTypes={assetTypes}
              defaults={{
                jobLead: sale.jobLead,
                status: sale.status,
                salesmanName: sale.salesmanName,
                salesmanUserId: sale.salesmanUserId,
                location: sale.location,
                contactPhone: sale.contactPhone,
                contactName: sale.contactName,
                notes: sale.notes,
                lastContactAt: sale.lastContactAt,
                assetTypeSlug: sale.assetTypeSlug,
                assetName: sale.assetName,
                serialNumber: sale.serialNumber,
                locationNote: sale.locationNote,
                farmerId: sale.farmerId,
                farmId: sale.farmId,
                storeId: sale.storeId,
              }}
            />
            <button className="rounded-lg bg-emerald-800 px-4 py-2 font-semibold text-white">Save changes</button>
          </ActionForm>
        )}

        {canDeleteRecords(session.role) ? (
          <div className="mt-4">
            <DeleteButton
              action={deleteSaleAction}
              name="saleId"
              value={sale.id}
              label="Delete sale"
              confirmText="Delete this sale prospect?"
            />
          </div>
        ) : null}
      </div>

      <div className="lg:col-span-2">
        {!finished ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-6">
            <h2 className="font-display text-xl">Finish sale</h2>
            <p className="mt-1 text-sm text-stone-600">
              Creates a {expectedType ? assetTypeSingular(expectedType.name).toLowerCase() : "asset"} for this
              customer and marks the sale completed.
            </p>
            <ActionForm action={finishSaleAction} className="mt-4 space-y-4">
              <input type="hidden" name="saleId" value={sale.id} />
              {!sale.farmerId ? (
                <p className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-amber-950">
                  Choose or create a customer on the left, save, then finish — or create the customer in the finish
                  form below is not supported; save the sale with a customer first.
                </p>
              ) : null}
              <label className="block text-sm font-medium">
                Asset type
                <select
                  name="assetTypeSlug"
                  defaultValue={sale.assetTypeSlug || expectedType?.slug || "pivots"}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                >
                  {assetTypes.map((type) => (
                    <option key={type.id} value={type.slug}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Asset name
                <input
                  name="assetName"
                  required
                  defaultValue={sale.assetName || sale.jobLead}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm font-medium">
                Serial number
                <input
                  name="serialNumber"
                  defaultValue={sale.serialNumber ?? ""}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </label>
              {sale.farmerId ? (
                <>
                  <p className="text-sm text-stone-700">
                    Customer: <span className="font-medium text-stone-900">{sale.farmer?.name}</span>
                  </p>
                  <FarmSelect
                    farms={farms}
                    farmerId={sale.farmerId}
                    defaultFarmId={sale.farmId}
                    hint="Farms for this customer only."
                  />
                </>
              ) : null}
              <MapLocationPicker
                apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || undefined}
                defaultLat={sale.latitude ?? undefined}
                defaultLng={sale.longitude ?? undefined}
              />
              <label className="block text-sm font-medium">
                Location note
                <input
                  name="locationNote"
                  defaultValue={sale.locationNote || sale.location || ""}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </label>
              <button
                className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                disabled={!sale.farmerId}
              >
                Finish & create asset
              </button>
            </ActionForm>
          </div>
        ) : (
          <div className="rounded-xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
            <p className="font-semibold text-stone-800">Contact</p>
            <p className="mt-2">{sale.contactName || "—"}</p>
            <p>{sale.contactPhone || "—"}</p>
            <p className="mt-4 font-semibold text-stone-800">Location</p>
            <p className="mt-2">{sale.location || "—"}</p>
            <p className="mt-4 font-semibold text-stone-800">Salesman</p>
            <p className="mt-2">{sale.salesmanUser?.name || sale.salesmanName || "—"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
