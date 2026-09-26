import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PRIORITIES, canEditWorkOrder } from "@/lib/roles";
import { homePath } from "@/lib/home";
import { editWorkOrderAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { NewTicketSiteFields } from "@/components/NewTicketSiteFields";
import { StoreSelect } from "@/components/StoreSelect";
import { ScheduleDateTimeField } from "@/components/ScheduleDateTimeField";
import { getRequestLocale } from "@/lib/user-locale";
import { priorityLabel, t } from "@/lib/i18n";
import { assetWhere, loadTechnicians, pivotWhere, ticketWhere } from "@/lib/scope";
import { ensureAssetTypes } from "@/lib/assets";
import { resolvedTicketStoreId } from "@/lib/stores";

export default async function EditTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canEditWorkOrder(session.role)) redirect(homePath(session.role));
  const locale = await getRequestLocale();
  const { id } = await params;

  const ticket = await prisma.ticket.findFirst({
    where: { id, ...ticketWhere(session) },
    include: {
      farmer: { select: { storeId: true } },
      asset: { include: { assetType: true } },
    },
  });
  if (!ticket) notFound();

  const [pivots, assets, types, technicians, farmers, stores] = await Promise.all([
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
    prisma.farmer.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.store.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="max-w-3xl">
      <p className="text-sm">
        <Link href={`/tickets/${ticket.id}`} className="text-emerald-800 hover:underline">
          {t(locale, "ticket.number", { number: ticket.number })}
        </Link>
      </p>
      <h1 className="font-display mt-1 text-3xl">{t(locale, "ticket.editTitle", { number: ticket.number })}</h1>
      <p className="mt-1 text-sm text-stone-600">{t(locale, "ticket.editHelp")}</p>
      <ActionForm action={editWorkOrderAction} className="mt-6 space-y-4 rounded-xl border border-stone-200 bg-white p-6">
        <input type="hidden" name="ticketId" value={ticket.id} />
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
          canAddFarmer
          mapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || undefined}
          defaultPivotId={ticket.pivotId ?? undefined}
          defaultAssetId={ticket.assetId ?? undefined}
          defaultTypeSlug={ticket.asset?.assetType.slug}
          defaultFarmerId={ticket.farmerId}
        />
        <label className="block text-sm font-medium">
          {t(locale, "ticket.title")}
          <input
            name="title"
            required
            defaultValue={ticket.title}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm font-medium">
          {t(locale, "ticket.description")}
          <textarea
            name="description"
            required
            rows={4}
            defaultValue={ticket.description}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm font-medium">
          {t(locale, "ticket.priority")}
          <select name="priority" defaultValue={ticket.priority} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2">
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {priorityLabel(locale, p)}
              </option>
            ))}
          </select>
        </label>
        <StoreSelect stores={stores} defaultValue={resolvedTicketStoreId(ticket)} label={t(locale, "common.store")} />
        <label className="block text-sm font-medium">
          {t(locale, "ticket.assignTech")}
          <select name="technicianId" defaultValue={ticket.technicianId ?? ""} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2">
            <option value="">{t(locale, "common.unassigned")}</option>
            {technicians.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.name}
              </option>
            ))}
          </select>
        </label>
        <ScheduleDateTimeField label={t(locale, "ticket.scheduledFor")} initialValue={ticket.scheduledAt} />
        <div className="flex flex-wrap gap-2">
          <button className="rounded-lg bg-emerald-800 px-4 py-2 font-semibold text-white">{t(locale, "common.save")}</button>
          <Link
            href={`/tickets/${ticket.id}`}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50"
          >
            {t(locale, "common.cancel")}
          </Link>
        </div>
      </ActionForm>
    </div>
  );
}
