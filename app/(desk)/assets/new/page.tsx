import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { assetTypeNewHref, assetTypeSingular, ensureAssetTypes, isPivotAssetType } from "@/lib/assets";
import { createAssetAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { NewAssetFields } from "@/components/NewAssetFields";

export default async function NewAssetPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === ROLES.FARMER) redirect("/assets");

  const query = await searchParams;
  const types = await ensureAssetTypes(session.organizationId);
  const selected = types.find((type) => type.slug === query.type?.trim());
  if (!selected) redirect("/assets");
  if (isPivotAssetType(selected)) redirect(assetTypeNewHref(selected));

  const [farmers, farms] = await Promise.all([
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
  ]);

  const label = assetTypeSingular(selected.name);

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl">Add {label.toLowerCase()}</h1>
      <p className="mt-1 text-sm text-stone-600">
        Pick an existing customer or add a new one, then click the map to set the location.
      </p>
      <ActionForm action={createAssetAction} className="mt-6 space-y-4 rounded-xl border border-stone-200 bg-white p-6">
        <input type="hidden" name="assetTypeId" value={selected.id} />
        <NewAssetFields
          farmers={farmers}
          farms={farms}
          mapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || undefined}
          nameLabel={`${label} name`}
        />
        <button className="rounded-lg bg-emerald-800 px-4 py-2 font-semibold text-white">Save {label.toLowerCase()}</button>
      </ActionForm>
    </div>
  );
}
