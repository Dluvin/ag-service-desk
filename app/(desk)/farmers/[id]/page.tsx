import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES, canDeleteRecords, isShopStaff } from "@/lib/roles";
import { addFarmerContactAction, deleteFarmerAction, deleteFarmerContactAction, updateFarmerAction, updateFarmerContactAction, updateFarmerStoreAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { DeleteButton } from "@/components/DeleteButton";
import { SelectableMap } from "@/components/SelectableMap";
import { StatusBadge } from "@/components/Badges";
import { StoreSelect } from "@/components/StoreSelect";
import { WelcomeMailNotice } from "@/components/WelcomeMailNotice";
import { CustomerFarms } from "@/components/CustomerFarms";
import { FarmerPivotList } from "@/components/FarmerPivotList";
import { UNASSIGNED_FARM_LABEL } from "@/lib/farms";

export default async function FarmerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ welcome?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const query = await searchParams;

  if (session.role === ROLES.FARMER && session.farmerId !== id) notFound();

  const farmer = await prisma.farmer.findFirst({
    where: { id, organizationId: session.organizationId },
    include: {
      store: true,
      contacts: { orderBy: { name: "asc" } },
      farms: {
        orderBy: { name: "asc" },
        include: {
          assignments: {
            orderBy: { startYear: "desc" },
            include: { farmer: { select: { name: true } } },
          },
        },
      },
      pivots: { orderBy: { name: "asc" }, include: { farm: true, documents: { orderBy: { createdAt: "desc" } } } },
      assets: { orderBy: { name: "asc" }, include: { farm: true, assetType: true } },
      tickets: { include: { pivot: true }, orderBy: { updatedAt: "desc" }, take: 12 },
    },
  });
  if (!farmer) notFound();

  const [stores, customers] = await Promise.all([
    prisma.store.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.farmer.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  const canEdit = isShopStaff(session.role);

  return (
    <div>
      <h1 className="font-display text-3xl">{farmer.name}</h1>
      <WelcomeMailNotice status={query.welcome} />
      {farmer.address ? <p className="text-stone-600">{farmer.address}</p> : null}
      {farmer.store ? <p className="text-sm text-stone-600">Default store: {farmer.store.name}</p> : null}
      {canDeleteRecords(session.role) ? (
        <div className="mt-3">
          <DeleteButton
            action={deleteFarmerAction}
            name="farmerId"
            value={farmer.id}
            label="Delete customer"
            confirmText={`Delete ${farmer.name} and its farms, pivots, and work orders? This cannot be undone.`}
          />
        </div>
      ) : null}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SelectableMap
          store={farmer.storeId}
          markers={[
            ...farmer.pivots.map((pivot) => ({
              id: pivot.id,
              name: pivot.name,
              lat: pivot.latitude,
              lng: pivot.longitude,
              subtitle: pivot.serialNumber ?? undefined,
            })),
            ...farmer.assets.map((asset) => ({
              id: asset.id,
              name: asset.name,
              lat: asset.latitude,
              lng: asset.longitude,
              subtitle: asset.assetType.name,
            })),
          ]}
        />
        <div>
          {canEdit ? (
            <ActionForm action={updateFarmerAction} className="mb-6 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
              <input type="hidden" name="farmerId" value={farmer.id} />
              <h2 className="font-display text-xl">Edit customer</h2>
              <label className="block text-sm font-medium">
                Customer name
                <input name="name" required defaultValue={farmer.name} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium">
                Address
                <input name="address" defaultValue={farmer.address ?? ""} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
              </label>
              <StoreSelect stores={stores} defaultValue={farmer.storeId} />
              <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Save customer</button>
            </ActionForm>
          ) : session.role === ROLES.FARMER ? (
            <ActionForm action={updateFarmerStoreAction} className="mb-6 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
              <input type="hidden" name="farmerId" value={farmer.id} />
              <h2 className="font-display text-xl">Default store</h2>
              <p className="text-sm text-stone-600">Pick the shop that should see your service calls on dispatch.</p>
              <StoreSelect stores={stores} defaultValue={farmer.storeId} />
              <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Save default store</button>
            </ActionForm>
          ) : null}

          <h2 className="font-display text-xl">Contacts</h2>
          {farmer.contacts.length ? (
            <ul className="mt-2 space-y-3">
              {farmer.contacts.map((contact) => (
                <li key={contact.id} className="rounded-xl border border-stone-200 bg-white p-4">
                  {canEdit ? (
                    <>
                      <ActionForm action={updateFarmerContactAction} className="space-y-3">
                        <input type="hidden" name="contactId" value={contact.id} />
                        <label className="block text-sm font-medium">
                          Name
                          <input name="contactName" required defaultValue={contact.name} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
                        </label>
                        <label className="block text-sm font-medium">
                          Phone
                          <input name="contactPhone" defaultValue={contact.phone ?? ""} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
                        </label>
                        <label className="block text-sm font-medium">
                          Email
                          <input name="contactEmail" type="email" defaultValue={contact.email ?? ""} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
                        </label>
                        <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Save contact</button>
                      </ActionForm>
                      {canDeleteRecords(session.role) ? (
                        <div className="mt-3">
                          <DeleteButton
                            action={deleteFarmerContactAction}
                            name="contactId"
                            value={contact.id}
                            label="Delete contact"
                            confirmText={`Delete contact ${contact.name}?`}
                          />
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <p className="font-medium">{contact.name}</p>
                      <p className="text-sm text-stone-600">
                        {[contact.phone, contact.email].filter(Boolean).join(" · ") || "No phone or email"}
                      </p>
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-stone-600">
              {[farmer.phone, farmer.email].filter(Boolean).join(" · ") || "No contacts yet."}
            </p>
          )}
          {canEdit ? (
            <ActionForm action={addFarmerContactAction} className="mt-3 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
              <input type="hidden" name="farmerId" value={farmer.id} />
              <p className="text-sm font-semibold text-stone-800">Add contact</p>
              <label className="block text-sm font-medium">
                Name
                <input name="contactName" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium">
                Phone
                <input name="contactPhone" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium">
                Email
                <input name="contactEmail" type="email" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
              </label>
              <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Save contact</button>
            </ActionForm>
          ) : null}
        </div>
      </div>
      <CustomerFarms
        farmerId={farmer.id}
        canEdit={canEdit}
        canDelete={canDeleteRecords(session.role)}
        customers={customers}
        farms={farmer.farms.map((farm) => ({
          id: farm.id,
          name: farm.name,
          location: farm.location,
          farmerId: farm.farmerId,
          assignments: farm.assignments.map((assignment) => ({
            startYear: assignment.startYear,
            endYear: assignment.endYear,
            farmerName: assignment.farmer.name,
          })),
        }))}
      />
      <FarmerPivotList
        canManage={canEdit}
        farmerId={farmer.id}
        farms={farmer.farms.map((farm) => ({ farmId: farm.id, farmName: farm.name }))}
        pivots={farmer.pivots.map((pivot) => ({
          id: pivot.id,
          name: pivot.name,
          latitude: pivot.latitude,
          longitude: pivot.longitude,
          locationNote: pivot.locationNote,
          serialNumber: pivot.serialNumber,
          farmId: pivot.farmId,
          farmName: pivot.farm?.name ?? UNASSIGNED_FARM_LABEL,
          documents: pivot.documents.map((document) => ({
            id: document.id,
            fileName: document.fileName,
            mimeType: document.mimeType,
            createdAt: document.createdAt.toISOString(),
          })),
        }))}
        assets={farmer.assets.map((asset) => ({
          id: asset.id,
          name: asset.name,
          typeName: asset.assetType.name,
          href: `/assets/${asset.id}`,
          farmId: asset.farmId,
          farmName: asset.farm?.name ?? UNASSIGNED_FARM_LABEL,
        }))}
      />
      <h2 className="font-display mt-8 text-xl">Work orders</h2>
      <Link href="/tickets/new" className="mt-1 inline-block text-sm font-semibold text-emerald-800">
        Request service
      </Link>
      <ul className="mt-2 space-y-2">
        {farmer.tickets.map((ticket) => (
          <li key={ticket.id} className="flex items-center justify-between gap-2">
            <Link href={`/tickets/${ticket.id}`} className="hover:underline">
              #{ticket.number} {ticket.title}
            </Link>
            <StatusBadge status={ticket.status} />
          </li>
        ))}
      </ul>
    </div>
  );
}
