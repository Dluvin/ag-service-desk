import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadTechnicians, ticketWhere } from "@/lib/scope";
import { canAssignTickets, canDeleteRecords, isShopStaff } from "@/lib/roles";
import { updateTicketAction, addTicketPartAction, addTicketLaborAction, addTicketEquipmentAction, deleteTicketAction, updateTicketPartAction, deleteTicketPartAction, updateTicketLaborAction, deleteTicketLaborAction, updateTicketEquipmentAction, deleteTicketEquipmentAction } from "@/lib/actions";
import { queueQbEstimateAction } from "@/lib/qbwc-actions";
import { ActionForm } from "@/components/ActionForm";
import { DeleteButton } from "@/components/DeleteButton";
import { GoogleMapPanel } from "@/components/GoogleMapPanel";
import { googleMapsPlaceUrl } from "@/lib/maps";
import { PriorityBadge, StatusBadge } from "@/components/Badges";
import { TicketStatusFields } from "@/components/TicketStatusFields";
import { TicketPhotoFields } from "@/components/TicketPhotoFields";
import { TicketPhotoGrid } from "@/components/TicketPhotoGrid";
import { PartsPicker } from "@/components/PartsPicker";
import { LaborPicker } from "@/components/LaborPicker";
import { EquipmentPicker } from "@/components/EquipmentPicker";
import { TicketLineItemRow } from "@/components/TicketLineItemRow";
import { TicketCatalogQuickCreate } from "@/components/TicketCatalogQuickCreate";
import { TicketOcrImport } from "@/components/TicketOcrImport";
import { CollapsiblePanel } from "@/components/CollapsiblePanel";
import { formatDuration, visitMinutes } from "@/lib/onsite";
import { formatSchedule } from "@/lib/schedule";
import { ScheduleDateTimeField } from "@/components/ScheduleDateTimeField";
import { StoreSelect } from "@/components/StoreSelect";
import { resolvedTicketStoreId, ticketStoreName } from "@/lib/stores";
import { getRequestLocale } from "@/lib/user-locale";
import { statusLabel, t, type Locale } from "@/lib/i18n";
import { visionOcrConfigured } from "@/lib/ticket-ocr";
import { orgOcrIsOn } from "@/lib/ocr-samples";
import { ticketSite } from "@/lib/ticket-site";

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const locale = await getRequestLocale();
  const { id } = await params;

  const ticket = await prisma.ticket.findFirst({
    where: { id, ...ticketWhere(session) },
    include: {
      farmer: { include: { contacts: { orderBy: { name: "asc" } }, store: true } },
      pivot: true,
      asset: { include: { assetType: true } },
      technician: true,
      store: true,
        updates: { include: { user: true, photos: true }, orderBy: { createdAt: "desc" } },
        parts: { include: { user: true }, orderBy: { createdAt: "asc" } },
        labor: { include: { user: true }, orderBy: { createdAt: "asc" } },
        equipment: { include: { user: true }, orderBy: { createdAt: "asc" } },
        siteVisits: { orderBy: { startedAt: "asc" } },
        photos: { orderBy: { createdAt: "desc" } },
        inspections: { orderBy: { createdAt: "desc" } },
        qbEstimateJobs: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!ticket) notFound();
  const site = ticketSite(ticket);

  const technicians = canAssignTickets(session.role) ? await loadTechnicians(session.organizationId) : [];
  const canDispatch = isShopStaff(session.role);
  const stores = canDispatch
    ? await prisma.store.findMany({
        where: { organizationId: session.organizationId },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : [];
  const shopName = ticketStoreName(ticket);
  const ocrConfigured = visionOcrConfigured();
  const ocrEnabled = await orgOcrIsOn(session.organizationId);

  return (
    <div className="grid gap-6 lg:grid-cols-5 lg:items-start">
      <div className="lg:col-span-3">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500">
          <span>{t(locale, "ticket.number", { number: ticket.number })}</span>
          {site ? (
            <a
              href={googleMapsPlaceUrl(site.latitude, site.longitude)}
              target="_blank"
              rel="noreferrer"
              className="min-h-11 inline-flex items-center font-medium text-emerald-800 hover:underline"
            >
              {t(locale, "ticket.maps")}
            </a>
          ) : null}
        </p>
        <h1 className="font-display text-3xl">{ticket.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          {ticket.invoiceNumber ? (
            <span className="text-sm font-medium text-stone-700">
              {t(locale, "ticket.invoice", { number: ticket.invoiceNumber })}
              {ticket.invoiceAmount != null ? ` · $${ticket.invoiceAmount.toFixed(2)}` : ""}
            </span>
          ) : null}
          {canAssignTickets(session.role) ? (
            <ActionForm action={queueQbEstimateAction} className="inline">
              <input type="hidden" name="ticketId" value={ticket.id} />
              <button className="rounded-lg border border-emerald-800 px-3 py-1.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">
                Send as QuickBooks estimate
              </button>
            </ActionForm>
          ) : null}
          <Link
            href={`/tickets/${ticket.id}/print`}
            className="rounded-lg bg-emerald-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            {t(locale, "ticket.print")}
          </Link>
          {canDeleteRecords(session.role) ? (
            <DeleteButton
              action={deleteTicketAction}
              name="ticketId"
              value={ticket.id}
              label={t(locale, "ticket.delete")}
              confirmText={t(locale, "ticket.deleteConfirm", { number: ticket.number })}
              typedMatch={String(ticket.number)}
            />
          ) : null}
        </div>
        {ticket.qbEstimateJobs[0] ? (
          <p className="mt-2 text-sm text-stone-600">
            {ticket.qbEstimateJobs[0].status === "SENT"
              ? `QuickBooks estimate${ticket.qbEstimateJobs[0].qbRefNumber ? ` #${ticket.qbEstimateJobs[0].qbRefNumber}` : ""} sent`
              : ticket.qbEstimateJobs[0].status === "ERROR"
                ? `QuickBooks estimate failed: ${ticket.qbEstimateJobs[0].error || "see Web Connector"}`
                : ticket.qbEstimateJobs[0].status === "SENDING"
                  ? "QuickBooks estimate is sending now"
                  : "QuickBooks estimate queued — run Update Selected in Web Connector"}
          </p>
        ) : null}
        {ticket.inspections[0] ? (
          <p className="mt-2 text-sm">
            <Link href={`/startup/${ticket.inspections[0].id}`} className="text-emerald-800 hover:underline">
              {t(locale, "ticket.checklist")}
            </Link>
          </p>
        ) : null}
        <p className="mt-4 whitespace-pre-wrap text-stone-700">{ticket.description}</p>
        <p className="mt-3 text-sm text-stone-600">
          <Link href={`/farmers/${ticket.farmerId}`} className="text-emerald-800 hover:underline">
            {ticket.farmer.name}
          </Link>
          {ticket.farmer.contacts.length
            ? ` · ${ticket.farmer.contacts.map((contact) => [contact.name, contact.phone].filter(Boolean).join(" ")).join("; ")}`
            : ticket.farmer.phone
              ? ` · ${ticket.farmer.phone}`
              : ""}
          {" · "}
          {site ? (
            <Link href={site.href} className="text-emerald-800 hover:underline">
              {site.name}
            </Link>
          ) : (
            "Asset"
          )}
          {" · "}
          {ticket.technician ? t(locale, "ticket.assignedTo", { name: ticket.technician.name }) : t(locale, "common.unassigned")}
          {shopName ? ` · ${shopName}` : ""}
          {ticket.scheduledAt ? ` · ${t(locale, "ticket.scheduled", { when: formatSchedule(ticket.scheduledAt) ?? "" })}` : ""}
        </p>

        {ticket.siteVisits.length > 0 ? (
          <section className="mt-6 rounded-xl border border-stone-200 bg-white p-4">
            <h2 className="font-display text-lg">{t(locale, "ticket.onsite")}</h2>
            <p className="mt-1 text-sm text-stone-700">
              {t(locale, "ticket.billable", { duration: formatDuration(visitMinutes(ticket.siteVisits) * 60_000) })}
            </p>
            <ul className="mt-3 space-y-1 text-sm text-stone-600">
              {ticket.siteVisits.map((visit) => (
                <li key={visit.id}>
                  {new Date(visit.startedAt).toLocaleString()} –{" "}
                  {visit.endedAt ? new Date(visit.endedAt).toLocaleString() : t(locale, "ticket.onSiteNow")}
                  {visit.vehicleNumber ? ` · ${t(locale, "ticket.vehicle", { number: visit.vehicleNumber })}` : ""}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <CollapsiblePanel
            title={canDispatch ? t(locale, "ticket.addUpdate") : t(locale, "ticket.addInfo")}
            hideLabel={canDispatch ? t(locale, "ticket.hideAddUpdate") : t(locale, "ticket.hideAddInfo")}
            defaultOpen={false}
          >
            <ActionForm action={updateTicketAction} encType="multipart/form-data" className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
              <input type="hidden" name="ticketId" value={ticket.id} />
              {canDispatch ? (
                <>
                  <TicketStatusFields
                    status={ticket.status}
                    invoiceNumber={ticket.invoiceNumber}
                    invoiceAmount={ticket.invoiceAmount}
                  />
                  <ScheduleDateTimeField label={t(locale, "ticket.scheduledFor")} initialValue={ticket.scheduledAt} />
                  <StoreSelect stores={stores} defaultValue={ticket.storeId ?? ticket.farmer.storeId} label={t(locale, "common.store")} />
                  {canAssignTickets(session.role) ? (
                    <label className="block text-sm font-medium">
                      {t(locale, "ticket.technician")}
                      <select name="technicianId" defaultValue={ticket.technicianId ?? ""} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2">
                        <option value="">{t(locale, "common.unassigned")}</option>
                        {technicians.map((tech) => (
                          <option key={tech.id} value={tech.id}>
                            {tech.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <input type="hidden" name="technicianId" value={ticket.technicianId ?? ""} />
                  )}
                </>
              ) : (
                <input type="hidden" name="status" value={ticket.status} />
              )}
              <label className="block text-sm font-medium">
                {canDispatch ? t(locale, "ticket.workNote") : t(locale, "ticket.addInfo")}
                <textarea
                  name="message"
                  rows={4}
                  placeholder={
                    canDispatch
                      ? t(locale, "ticket.notePlaceholder")
                      : t(locale, "ticket.customerPlaceholder")
                  }
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </label>
              <TicketPhotoFields />
              <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                {canDispatch ? t(locale, "ticket.saveUpdate") : t(locale, "ticket.addToWo")}
              </button>
            </ActionForm>
          </CollapsiblePanel>

        {canDispatch ? (
          <div className="mt-6">
            <TicketOcrImport
              ticketId={ticket.id}
              configured={ocrConfigured}
              enabled={ocrEnabled}
              photos={ticket.photos.map((photo) => ({ id: photo.id, fileName: photo.fileName }))}
            />
          </div>
        ) : null}

        {ticket.photos.length > 0 ? (
          <section className="mt-8">
            <h2 className="font-display text-xl">{t(locale, "ticket.photos")}</h2>
            <TicketPhotoGrid photos={ticket.photos} canDelete={canDispatch} />
          </section>
        ) : null}

        <h2 className="font-display mt-8 text-xl">{t(locale, "ticket.parts")}</h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-stone-200 bg-white">
        <ul className="divide-y divide-stone-100">
          {ticket.parts.length === 0 ? (
            <li className="p-4 text-sm text-stone-600">{t(locale, "ticket.noParts")}</li>
          ) : (
            ticket.parts.map((part) => (
              <TicketLineItemRow
                key={part.id}
                id={part.id}
                name={part.name}
                sku={part.sku}
                rate={part.unitPrice != null ? t(locale, "ticket.ea", { amount: part.unitPrice.toFixed(2) }) : null}
                amount={part.quantity}
                amountName="quantity"
                amountLabel={t(locale, "ticket.quantity")}
                loggedBy={`${part.user.name} · ${new Date(part.createdAt).toLocaleString()}`}
                canEdit={canDispatch}
                updateAction={updateTicketPartAction}
                deleteAction={deleteTicketPartAction}
                deleteLabel={t(locale, "ticket.removeQty", { qty: part.quantity, name: part.name })}
              />
            ))
          )}
        </ul>
        {canDispatch ? (
          <div className="space-y-3 border-t border-stone-200 p-4">
          <ActionForm action={addTicketPartAction} className="space-y-3">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <PartsPicker />
            <label className="block text-sm font-medium">
              {t(locale, "ticket.customName")}
              <input name="name" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" placeholder={t(locale, "ticket.customPlaceholder")} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                {t(locale, "ticket.quantity")}
                <input name="quantity" type="number" min="0.25" step="0.25" defaultValue="1" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium">
                {t(locale, "ticket.sku")}
                <input name="sku" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" placeholder={t(locale, "ticket.catalogFill")} />
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">{t(locale, "ticket.logPart")}</button>
              <TicketCatalogQuickCreate ticketId={ticket.id} kind="part" />
            </div>
          </ActionForm>
          </div>
        ) : null}
        </div>

        <h2 className="font-display mt-8 text-xl">{t(locale, "ticket.labor")}</h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-stone-200 bg-white">
        <ul className="divide-y divide-stone-100">
          {ticket.labor.length === 0 ? (
            <li className="p-4 text-sm text-stone-600">{t(locale, "ticket.noLabor")}</li>
          ) : (
            ticket.labor.map((item) => (
              <TicketLineItemRow
                key={item.id}
                id={item.id}
                name={item.name}
                sku={item.sku}
                rate={item.unitRate != null ? t(locale, "ticket.perHour", { amount: item.unitRate.toFixed(2) }) : null}
                amount={item.hours}
                amountName="hours"
                amountLabel={t(locale, "ticket.hours")}
                loggedBy={`${item.user.name} · ${new Date(item.createdAt).toLocaleString()}`}
                canEdit={canDispatch}
                updateAction={updateTicketLaborAction}
                deleteAction={deleteTicketLaborAction}
                deleteLabel={t(locale, "ticket.removeHours", { hours: item.hours, name: item.name })}
              />
            ))
          )}
        </ul>
        {canDispatch ? (
          <div className="space-y-3 border-t border-stone-200 p-4">
          <ActionForm action={addTicketLaborAction} className="space-y-3">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <LaborPicker />
            <label className="block text-sm font-medium">
              {t(locale, "ticket.customName")}
              <input name="name" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" placeholder={t(locale, "ticket.customPlaceholder")} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                {t(locale, "ticket.hours")}
                <input name="hours" type="number" min="0.25" step="0.25" defaultValue="1" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium">
                {t(locale, "ticket.code")}
                <input name="sku" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" placeholder={t(locale, "ticket.catalogFill")} />
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">{t(locale, "ticket.logLabor")}</button>
              <TicketCatalogQuickCreate ticketId={ticket.id} kind="labor" />
            </div>
          </ActionForm>
          </div>
        ) : null}
        </div>

        <h2 className="font-display mt-8 text-xl">{t(locale, "ticket.equipment")}</h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-stone-200 bg-white">
        <ul className="divide-y divide-stone-100">
          {ticket.equipment.length === 0 ? (
            <li className="p-4 text-sm text-stone-600">{t(locale, "ticket.noEquipment")}</li>
          ) : (
            ticket.equipment.map((item) => (
              <TicketLineItemRow
                key={item.id}
                id={item.id}
                name={item.name}
                sku={item.sku}
                rate={item.unitRate != null ? t(locale, "ticket.perHour", { amount: item.unitRate.toFixed(2) }) : null}
                amount={item.hours}
                amountName="hours"
                amountLabel={t(locale, "ticket.hours")}
                loggedBy={`${item.user.name} · ${new Date(item.createdAt).toLocaleString()}`}
                canEdit={canDispatch}
                updateAction={updateTicketEquipmentAction}
                deleteAction={deleteTicketEquipmentAction}
                deleteLabel={t(locale, "ticket.removeHours", { hours: item.hours, name: item.name })}
              />
            ))
          )}
        </ul>
        {canDispatch ? (
          <div className="space-y-3 border-t border-stone-200 p-4">
          <ActionForm action={addTicketEquipmentAction} className="space-y-3">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <EquipmentPicker />
            <label className="block text-sm font-medium">
              {t(locale, "ticket.customName")}
              <input name="name" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" placeholder={t(locale, "ticket.customPlaceholder")} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                {t(locale, "ticket.hours")}
                <input name="hours" type="number" min="0.25" step="0.25" defaultValue="1" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium">
                {t(locale, "ticket.code")}
                <input name="sku" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" placeholder={t(locale, "ticket.catalogFill")} />
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">{t(locale, "ticket.logEquipment")}</button>
              <TicketCatalogQuickCreate ticketId={ticket.id} kind="equipment" />
            </div>
          </ActionForm>
          </div>
        ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:col-span-2">
        <GoogleMapPanel
          store={resolvedTicketStoreId(ticket)}
          markers={
            site
              ? [
                  {
                    id: site.href,
                    name: site.name,
                    lat: site.latitude,
                    lng: site.longitude,
                    subtitle: ticket.farmer.name,
                  },
                ]
              : []
          }
        />
        <section>
          <h2 className="font-display text-xl">{t(locale, "ticket.updates")}</h2>
          {ticket.updates.length > 0 ? (
            <>
              <ol className="mt-3 space-y-3">
                <TicketUpdateItem update={ticket.updates[0]} locale={locale} canDelete={canDispatch} />
              </ol>
              {ticket.updates.length > 1 ? (
                <CollapsiblePanel
                  title={t(locale, "ticket.showUpdates")}
                  hideLabel={t(locale, "ticket.hideUpdates")}
                  countLabel={`${ticket.updates.length - 1}`}
                  defaultOpen={false}
                >
                  <ol className="space-y-3">
                    {ticket.updates.slice(1).map((update) => (
                      <TicketUpdateItem key={update.id} update={update} locale={locale} canDelete={canDispatch} />
                    ))}
                  </ol>
                </CollapsiblePanel>
              ) : null}
            </>
          ) : (
            <p className="mt-3 text-sm text-stone-600">{t(locale, "ticket.noUpdates")}</p>
          )}
        </section>
      </div>
    </div>
  );
}

function TicketUpdateItem({
  update,
  locale,
  canDelete,
}: {
  update: {
    id: string;
    message: string;
    createdAt: Date;
    status: string | null;
    user: { name: string };
    photos: { id: string; fileName: string }[];
  };
  locale: Locale;
  canDelete: boolean;
}) {
  return (
    <li className="rounded-lg border border-stone-200 bg-white p-3">
      <p className="text-xs text-stone-500">
        {update.user.name} · {new Date(update.createdAt).toLocaleString()}
        {update.status ? ` · ${statusLabel(locale, update.status)}` : ""}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-stone-800">{update.message}</p>
      <TicketPhotoGrid photos={update.photos} canDelete={canDelete} />
    </li>
  );
}
