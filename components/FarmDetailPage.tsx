import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { farmWhere } from "@/lib/scope";
import { ROLES, canDeleteRecords, isShopStaff } from "@/lib/roles";
import { UNASSIGNED_FARM_LABEL } from "@/lib/farms";
import { deleteFarmAction, updateFarmAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { DeleteButton } from "@/components/DeleteButton";
import { AddAssetToFarmPanel } from "@/components/AddAssetToFarmPanel";
import { FarmCustomerField } from "@/components/FarmTypeahead";

export default async function FarmDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const farm = await prisma.farm.findFirst({
    where: { id, ...farmWhere(session) },
    include: {
      farmer: { include: { contacts: { orderBy: { name: "asc" } } } },
      pivots: { orderBy: { name: "asc" }, select: { id: true, name: true, serialNumber: true } },
      assets: { orderBy: { name: "asc" }, include: { assetType: { select: { name: true } } } },
    },
  });
  if (!farm) notFound();
  if (session.role === ROLES.FARMER && session.farmerId !== farm.farmerId) notFound();
  const canEdit = isShopStaff(session.role);
  const contactRows = await prisma.$queryRaw<{ primaryContactId: string | null }[]>`
    SELECT primaryContactId FROM Farm WHERE id = ${farm.id}
  `;
  const primaryContactId = contactRows[0]?.primaryContactId ?? null;
  const contacts = farm.farmer.contacts;
  const primaryContact = contacts.find((c) => c.id === primaryContactId) ?? null;
  const shown = primaryContact ?? { name: farm.farmer.name, email: farm.farmer.email, phone: farm.farmer.phone };
  const [customers, customerPivots, customerAssets] = canEdit
    ? await Promise.all([
        prisma.farmer.findMany({
          where: { organizationId: session.organizationId },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        }),
        prisma.pivot.findMany({
          where: { organizationId: session.organizationId, farmerId: farm.farmerId },
          select: {
            id: true,
            name: true,
            serialNumber: true,
            farmerId: true,
            farmer: { select: { name: true } },
            farm: { select: { name: true } },
          },
          orderBy: { name: "asc" },
        }),
        prisma.asset.findMany({
          where: { organizationId: session.organizationId, farmerId: farm.farmerId },
          select: {
            id: true,
            name: true,
            farmerId: true,
            farmer: { select: { name: true } },
            farm: { select: { name: true } },
            assetType: { select: { name: true } },
          },
          orderBy: { name: "asc" },
        }),
      ])
    : [[], [], []];

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-500">
        <Link href="/farms" className="text-emerald-800 hover:underline">
          Farms
        </Link>
        {" / "}
        {farm.name}
      </p>
      <h1 className="font-display text-3xl">{farm.name}</h1>
      {farm.location ? <p className="text-stone-600">{farm.location}</p> : null}
      <section className="rounded-xl border border-stone-200 bg-white p-4">
        <h2 className="font-display text-xl">Customer</h2>
        <p className="mt-2">
          <Link href={`/farmers/${farm.farmerId}`} className="font-semibold text-emerald-900 hover:underline">
            {farm.farmer.name}
          </Link>
        </p>
        <h3 className="mt-4 text-sm font-semibold text-stone-800">Primary contact</h3>
        <p className="mt-1 font-medium">{shown.name}</p>
        {shown.phone ? <p className="text-sm text-stone-600">{shown.phone}</p> : null}
        {shown.email ? <p className="text-sm text-stone-600">{shown.email}</p> : null}
      </section>
      {canEdit ? (
        <ActionForm action={updateFarmAction} className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
          <input type="hidden" name="farmId" value={farm.id} />
          <h2 className="font-display text-xl">Edit farm</h2>
          <label className="block text-sm font-medium">
            Farm name
            <input name="name" required defaultValue={farm.name} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            Location
            <input name="location" defaultValue={farm.location ?? ""} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <FarmCustomerField customers={customers} defaultFarmerId={farm.farmerId} />
          <label className="block text-sm font-medium">
            Primary contact
            <select
              name="primaryContactId"
              defaultValue={primaryContactId ?? ""}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            >
              <option value="">Customer record — {farm.farmer.name}</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.phone ? ` · ${c.phone}` : ""}
                </option>
              ))}
            </select>
          </label>
          <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Save farm</button>
        </ActionForm>
      ) : null}
      {canDeleteRecords(session.role) ? (
        <DeleteButton
          action={deleteFarmAction}
          name="farmId"
          value={farm.id}
          label="Delete farm"
          confirmText={`Delete ${farm.name}? Assets become Unassigned.`}
        />
      ) : null}
      <section>
        <h2 className="font-display text-xl">Assets on this farm</h2>
        {farm.pivots.length === 0 && farm.assets.length === 0 ? (
          <p className="mt-2 text-sm text-stone-600">No assets on this farm yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {farm.pivots.map((p) => (
              <li key={p.id} className="rounded-xl border border-stone-200 bg-white px-4 py-3">
                <Link href={`/pivots/${p.id}`} className="font-semibold text-emerald-900 hover:underline">
                  {p.name}
                </Link>
                <p className="text-sm text-stone-600">Pivots{p.serialNumber ? ` · SN ${p.serialNumber}` : ""}</p>
              </li>
            ))}
            {farm.assets.map((a) => (
              <li key={a.id} className="rounded-xl border border-stone-200 bg-white px-4 py-3">
                <Link href={`/assets/${a.id}`} className="font-semibold text-emerald-900 hover:underline">
                  {a.name}
                </Link>
                <p className="text-sm text-stone-600">{a.assetType.name}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      {canEdit ? (
        <AddAssetToFarmPanel
          farmerId={farm.farmerId}
          lockFarmId={farm.id}
          farms={[{ farmId: farm.id, farmName: farm.name, farmerId: farm.farmerId, farmerName: farm.farmer.name }]}
          assets={[
            ...customerPivots.map((p) => ({
              kind: "pivot" as const,
              id: p.id,
              name: p.name,
              typeName: "Pivots",
              farmName: p.farm?.name ?? UNASSIGNED_FARM_LABEL,
              farmerId: p.farmerId,
              farmerName: p.farmer.name,
              serialNumber: p.serialNumber,
            })),
            ...customerAssets.map((a) => ({
              kind: "asset" as const,
              id: a.id,
              name: a.name,
              typeName: a.assetType.name,
              farmName: a.farm?.name ?? UNASSIGNED_FARM_LABEL,
              farmerId: a.farmerId,
              farmerName: a.farmer.name,
            })),
          ]}
        />
      ) : null}
    </div>
  );
}
