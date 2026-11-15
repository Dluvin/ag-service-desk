import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES, canDeleteRecords, isShopStaff } from "@/lib/roles";
import { deleteFarmerAction, updateFarmerAction, updateFarmerStoreAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { DeleteButton } from "@/components/DeleteButton";
import { SelectableMap } from "@/components/SelectableMap";
import { StatusBadge } from "@/components/Badges";
import { StoreSelect } from "@/components/StoreSelect";
import { WelcomeMailNotice } from "@/components/WelcomeMailNotice";
import { CustomerContacts } from "@/components/CustomerContacts";
import { CustomerFarms } from "@/components/CustomerFarms";
import { FarmerPivotList } from "@/components/FarmerPivotList";
import { UNASSIGNED_FARM_LABEL } from "@/lib/farms";
import { getRequestLocale } from "@/lib/user-locale";
import { t } from "@/lib/i18n";

export default async function FarmerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ welcome?: string; invite?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const query = await searchParams;
  const locale = await getRequestLocale();

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
  const portalUsers = await prisma.user.findMany({
    where: { organizationId: session.organizationId, farmerId: farmer.id, role: ROLES.FARMER },
    select: { id: true, email: true },
  });
  const inviteTokens = portalUsers.length
    ? await prisma.passwordResetToken.findMany({
        where: { userId: { in: portalUsers.map((user) => user.id) } },
        orderBy: { createdAt: "desc" },
        select: { userId: true, createdAt: true, expiresAt: true },
      })
    : [];
  const latestInvite = new Map<string, { createdAt: Date; expiresAt: Date }>();
  for (const token of inviteTokens) {
    if (!latestInvite.has(token.userId)) latestInvite.set(token.userId, token);
  }
  const lastSeenById = new Map<string, Date | null>();
  if (portalUsers.length) {
    try {
      const ids = portalUsers.map((user) => `'${user.id}'`).join(",");
      const rows = await prisma.$queryRawUnsafe<{ id: string; lastSeenAt: Date | string | null }[]>(
        `SELECT id, lastSeenAt FROM User WHERE id IN (${ids})`,
      );
      for (const row of rows) {
        lastSeenById.set(row.id, row.lastSeenAt ? new Date(row.lastSeenAt) : null);
      }
    } catch {
      // lastSeenAt may be missing until prisma generate / db push
    }
  }
  const loginByEmail = new Map(
    portalUsers.map((user) => {
      const invite = latestInvite.get(user.id);
      return [
        user.email.toLowerCase(),
        {
          lastSeenAt: lastSeenById.get(user.id) ?? null,
          inviteSentAt: invite?.createdAt ?? null,
          inviteExpiresAt: invite?.expiresAt ?? null,
        },
      ];
    }),
  );

  return (
    <div>
      <h1 className="font-display text-3xl">{farmer.name}</h1>
      <WelcomeMailNotice status={query.welcome} />
      {farmer.address ? <p className="text-stone-600">{farmer.address}</p> : null}
      {farmer.store ? <p className="text-sm text-stone-600">{t(locale, "customers.defaultStore", { name: farmer.store.name })}</p> : null}
      {canDeleteRecords(session.role) ? (
        <div className="mt-3">
          <DeleteButton
            action={deleteFarmerAction}
            name="farmerId"
            value={farmer.id}
            label={t(locale, "customers.delete")}
            confirmText={t(locale, "customers.deleteConfirm", { name: farmer.name })}
            typedMatch={farmer.name}
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
              <h2 className="font-display text-xl">{t(locale, "customers.edit")}</h2>
              <label className="block text-sm font-medium">
                {t(locale, "customers.name")}
                <input name="name" required defaultValue={farmer.name} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium">
                {t(locale, "common.address")}
                <input name="address" defaultValue={farmer.address ?? ""} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
              </label>
              <StoreSelect stores={stores} defaultValue={farmer.storeId} />
              <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">{t(locale, "customers.save")}</button>
            </ActionForm>
          ) : session.role === ROLES.FARMER ? (
            <ActionForm action={updateFarmerStoreAction} className="mb-6 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
              <input type="hidden" name="farmerId" value={farmer.id} />
              <h2 className="font-display text-xl">{t(locale, "customers.defaultStoreTitle")}</h2>
              <p className="text-sm text-stone-600">{t(locale, "customers.defaultStoreHelp")}</p>
              <StoreSelect stores={stores} defaultValue={farmer.storeId} />
              <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">{t(locale, "customers.saveStore")}</button>
            </ActionForm>
          ) : null}

          <CustomerContacts
            farmerId={farmer.id}
            farmerPhone={farmer.phone}
            farmerEmail={farmer.email}
            canEdit={canEdit}
            canDelete={canDeleteRecords(session.role)}
            contacts={farmer.contacts.map((contact) => ({
              id: contact.id,
              name: contact.name,
              phone: contact.phone,
              email: contact.email,
              login: contact.email ? loginByEmail.get(contact.email.toLowerCase()) ?? null : null,
              flash: query.invite === contact.id ? query.welcome : undefined,
            }))}
          />
        </div>
      </div>
      <section className="mt-8">
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <h2 className="font-display text-xl">{t(locale, "tickets.title")}</h2>
            <Link href="/tickets/new" className="text-sm font-semibold text-emerald-800 hover:underline">
              {t(locale, "tickets.request")}
            </Link>
          </div>
          <div className="border-t border-stone-200 p-4">
            {farmer.tickets.length === 0 ? (
              <p className="text-sm text-stone-600">{t(locale, "tickets.emptyAll")}</p>
            ) : (
              <ul className="space-y-2">
                {farmer.tickets.map((ticket) => (
                  <li key={ticket.id} className="flex items-center justify-between gap-2">
                    <Link href={`/tickets/${ticket.id}`} className="hover:underline">
                      #{ticket.number} {ticket.title}
                    </Link>
                    <StatusBadge status={ticket.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
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
    </div>
  );
}
