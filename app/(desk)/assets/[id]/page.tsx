import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assetWhere } from "@/lib/scope";
import { canDeleteRecords, isShopStaff } from "@/lib/roles";
import { assetTypeHref, assetTypeSingular } from "@/lib/assets";
import { deleteAssetAction, updateAssetAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { DeleteButton } from "@/components/DeleteButton";
import { GoogleMapPanel } from "@/components/GoogleMapPanel";
import { MapLocationPicker } from "@/components/MapLocationPicker";
import { AssetOwnerFields } from "@/components/AssetOwnerFields";
import { UNASSIGNED_FARM_LABEL } from "@/lib/farms";

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;

  const asset = await prisma.asset.findFirst({
    where: { id, ...assetWhere(session) },
    include: { farmer: true, farm: true, assetType: true },
  });
  if (!asset) notFound();

  const canEdit = isShopStaff(session.role);
  const [customers, farms] = canEdit
    ? await Promise.all([
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
      ])
    : [[], []];
  const label = assetTypeSingular(asset.assetType.name);

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <p className="text-sm text-stone-500">
          <Link href="/assets" className="text-emerald-800 hover:underline">
            Assets
          </Link>
          {" / "}
          <Link href={assetTypeHref(asset.assetType)} className="text-emerald-800 hover:underline">
            {asset.assetType.name}
          </Link>
        </p>
        <h1 className="font-display text-3xl">{asset.name}</h1>
        <p className="text-stone-600">
          <Link href={`/farmers/${asset.farmerId}`} className="text-emerald-800 hover:underline">
            {asset.farmer.name}
          </Link>
          {` · ${asset.farm?.name ?? UNASSIGNED_FARM_LABEL}`}
          {asset.serialNumber ? ` · SN ${asset.serialNumber}` : ""}
        </p>
        {asset.locationNote ? <p className="mt-2 text-sm">{asset.locationNote}</p> : null}
        {asset.notes ? <p className="mt-2 whitespace-pre-wrap text-sm text-stone-800">{asset.notes}</p> : null}
        {canEdit ? (
          <ActionForm action={updateAssetAction} className="mt-6 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
            <input type="hidden" name="assetId" value={asset.id} />
            <h2 className="font-display text-xl">Edit {label.toLowerCase()}</h2>
            <AssetOwnerFields
              farmers={customers}
              farms={farms}
              defaultFarmerId={asset.farmerId}
              defaultFarmId={asset.farmId}
            />
            <label className="block text-sm font-medium">
              {label} name
              <input name="name" required defaultValue={asset.name} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
            </label>
            <label className="block text-sm font-medium">
              Serial number
              <input name="serialNumber" defaultValue={asset.serialNumber ?? ""} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
            </label>
            <label className="block text-sm font-medium">
              Location note
              <input name="locationNote" defaultValue={asset.locationNote ?? ""} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
            </label>
            <label className="block text-sm font-medium">
              Notes
              <textarea name="notes" rows={3} defaultValue={asset.notes ?? ""} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
            </label>
            <MapLocationPicker
              apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || undefined}
              defaultLat={asset.latitude}
              defaultLng={asset.longitude}
            />
            <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
              Save {label.toLowerCase()}
            </button>
          </ActionForm>
        ) : null}
        {canDeleteRecords(session.role) ? (
          <div className="mt-3">
            <DeleteButton
              action={deleteAssetAction}
              name="assetId"
              value={asset.id}
              label={`Delete ${label.toLowerCase()}`}
              confirmText={`Delete ${asset.name}? This cannot be undone.`}
              typedMatch={asset.name}
            />
          </div>
        ) : null}
      </div>
      <div className="lg:col-span-2">
        <GoogleMapPanel
          store={asset.farmer.storeId}
          markers={[
            {
              id: asset.id,
              name: asset.name,
              lat: asset.latitude,
              lng: asset.longitude,
              subtitle: asset.farmer.name,
            },
          ]}
        />
      </div>
    </div>
  );
}
