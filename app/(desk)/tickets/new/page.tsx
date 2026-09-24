import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PRIORITIES, ROLES, canAssignTickets, isShopStaff } from "@/lib/roles";
import { createTicketAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { NewTicketSiteFields } from "@/components/NewTicketSiteFields";
import { TicketPhotoFields } from "@/components/TicketPhotoFields";
import { TicketOcrImport } from "@/components/TicketOcrImport";
import { StoreSelect } from "@/components/StoreSelect";
import { ScheduleDateTimeField } from "@/components/ScheduleDateTimeField";
import { getRequestLocale } from "@/lib/user-locale";
import { priorityLabel, t } from "@/lib/i18n";
import { visionOcrConfigured } from "@/lib/ticket-ocr";
import { orgOcrIsOn } from "@/lib/ocr-samples";
import { assetWhere, pivotWhere, loadTechnicians } from "@/lib/scope";
import { ensureAssetTypes } from "@/lib/assets";

export default async function NewTicketPage({
  searchParams,
}: {
  searchParams: Promise<{ pivotId?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const locale = await getRequestLocale();
  const query = await searchParams;

  const [pivots, assets, types, technicians, farmers, stores, actor] = await Promise.all([
    prisma.pivot.findMany({
      where: pivotWhere(session),
      include: { farmer: true },
      orderBy: { name: "asc" },
    }),
    prisma.asset.findMany({
      where: assetWhere(session),
      include: { farmer: true, assetType: true },
      orderBy: { name: "asc" },
    }),
    ensureAssetTypes(session.organizationId),
    loadTechnicians(session.organizationId),
    session.role === ROLES.FARMER
      ? Promise.resolve([])
      : prisma.farmer.findMany({
          where: { organizationId: session.organizationId },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        }),
    prisma.store.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findFirst({
      where: { id: session.userId },
      select: { storeId: true },
    }),
  ]);

  const ocrEnabled = isShopStaff(session.role) ? await orgOcrIsOn(session.organizationId) : false;
  const showOcr = isShopStaff(session.role);

  return (
    <div className={showOcr ? "max-w-6xl" : "max-w-3xl"}>
      <h1 className="font-display text-3xl">
        {session.role === ROLES.FARMER ? t(locale, "ticket.requestTitle") : t(locale, "ticket.newTitle")}
      </h1>
      <p className="mt-1 text-sm text-stone-600">
        {session.role === ROLES.FARMER ? t(locale, "ticket.requestHelp") : t(locale, "ticket.newHelp")}
      </p>
      <div className={showOcr ? "lg:mt-6 lg:grid lg:grid-cols-5 lg:items-start lg:gap-8" : undefined}>
        {showOcr ? (
          <div className="order-1 mt-6 lg:order-2 lg:col-span-2 lg:mt-0">
            <TicketOcrImport configured={visionOcrConfigured()} enabled={ocrEnabled} />
          </div>
        ) : null}
        <ActionForm
          action={createTicketAction}
          encType="multipart/form-data"
          className={`mt-6 space-y-4 rounded-xl border border-stone-200 bg-white p-6 ${
            showOcr ? "order-2 lg:order-1 lg:col-span-3 lg:mt-0" : ""
          }`}
        >
        <NewTicketSiteFields
          pivots={pivots.map((pivot) => ({
            id: pivot.id,
            name: pivot.name,
            farmerName: pivot.farmer.name,
            farmerId: pivot.farmerId,
            latitude: pivot.latitude,
            longitude: pivot.longitude,
            locationNote: pivot.locationNote,
          }))}
          assets={assets.map((asset) => ({
            id: asset.id,
            name: asset.name,
            farmerName: asset.farmer.name,
            farmerId: asset.farmerId,
            latitude: asset.latitude,
            longitude: asset.longitude,
            locationNote: asset.locationNote,
            typeSlug: asset.assetType.slug,
          }))}
          types={types.map((type) => ({
            id: type.id,
            name: type.name,
            slug: type.slug,
            kind: type.kind,
          }))}
          farmers={farmers}
          canAddFarmer={isShopStaff(session.role)}
          mapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || undefined}
          lockedFarmerId={session.role === ROLES.FARMER ? session.farmerId : null}
          defaultPivotId={query.pivotId}
        />
        <label className="block text-sm font-medium">
          {t(locale, "ticket.title")}
          <input name="title" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
        </label>
        <label className="block text-sm font-medium">
          {t(locale, "ticket.description")}
          <textarea name="description" required rows={4} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
        </label>
        <label className="block text-sm font-medium">
          {t(locale, "ticket.priority")}
          <select name="priority" defaultValue="NORMAL" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2">
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {priorityLabel(locale, p)}
              </option>
            ))}
          </select>
        </label>
        {isShopStaff(session.role) ? (
          <StoreSelect stores={stores} defaultValue={actor?.storeId} label={t(locale, "common.store")} />
        ) : null}
        {canAssignTickets(session.role) ? (
          <label className="block text-sm font-medium">
            {t(locale, "ticket.assignTech")}
            <select name="technicianId" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2">
              <option value="">{t(locale, "common.unassigned")}</option>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <ScheduleDateTimeField label={t(locale, "ticket.scheduledFor")} />
        <TicketPhotoFields />
        <button className="rounded-lg bg-emerald-800 px-4 py-2 font-semibold text-white">
          {session.role === ROLES.FARMER ? t(locale, "tickets.request") : t(locale, "dispatch.create")}
        </button>
      </ActionForm>
      </div>
    </div>
  );
}
