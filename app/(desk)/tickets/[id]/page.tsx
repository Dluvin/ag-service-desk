import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadTechnicians, ticketWhere } from "@/lib/scope";
import { STATUS_LABELS, canAssignTickets, canDeleteRecords, isPrintableStatus, isShopStaff } from "@/lib/roles";
import { updateTicketAction, addTicketPartAction, addTicketLaborAction, addTicketEquipmentAction, deleteTicketAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { DeleteButton } from "@/components/DeleteButton";
import { GoogleMapPanel } from "@/components/GoogleMapPanel";
import { PriorityBadge, StatusBadge } from "@/components/Badges";
import { TicketStatusFields } from "@/components/TicketStatusFields";
import { TicketPhotoFields } from "@/components/TicketPhotoFields";
import { TicketPhotoGrid } from "@/components/TicketPhotoGrid";
import { PartsPicker } from "@/components/PartsPicker";
import { LaborPicker } from "@/components/LaborPicker";
import { EquipmentPicker } from "@/components/EquipmentPicker";
import { formatDuration, visitMinutes } from "@/lib/onsite";
import { formatSchedule, toDateTimeLocalValue } from "@/lib/schedule";
import { StoreSelect } from "@/components/StoreSelect";
import { ticketStoreName } from "@/lib/stores";

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;

  const ticket = await prisma.ticket.findFirst({
    where: { id, ...ticketWhere(session) },
    include: {
      farmer: { include: { contacts: { orderBy: { name: "asc" } }, store: true } },
      pivot: true,
      technician: true,
      store: true,
        updates: { include: { user: true, photos: true }, orderBy: { createdAt: "asc" } },
        parts: { include: { user: true }, orderBy: { createdAt: "asc" } },
        labor: { include: { user: true }, orderBy: { createdAt: "asc" } },
        equipment: { include: { user: true }, orderBy: { createdAt: "asc" } },
        siteVisits: { orderBy: { startedAt: "asc" } },
        photos: { orderBy: { createdAt: "desc" } },
        inspections: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!ticket) notFound();

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

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <p className="text-sm text-stone-500">Ticket #{ticket.number}</p>
        <h1 className="font-display text-3xl">{ticket.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          {ticket.invoiceNumber ? (
            <span className="text-sm font-medium text-stone-700">
              Invoice {ticket.invoiceNumber}
              {ticket.invoiceAmount != null ? ` · $${ticket.invoiceAmount.toFixed(2)}` : ""}
            </span>
          ) : null}
          {isPrintableStatus(ticket.status) ? (
            <Link
              href={`/tickets/${ticket.id}/print`}
              className="rounded-lg bg-emerald-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Print ticket
            </Link>
          ) : null}
          {canDeleteRecords(session.role) ? (
            <DeleteButton
              action={deleteTicketAction}
              name="ticketId"
              value={ticket.id}
              label="Delete ticket"
              confirmText={`Delete ticket #${ticket.number}? This cannot be undone.`}
            />
          ) : null}
        </div>
        {ticket.inspections[0] ? (
          <p className="mt-2 text-sm">
            <Link href={`/startup/${ticket.inspections[0].id}`} className="text-emerald-800 hover:underline">
              Maintenance checklist
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
          <Link href={`/pivots/${ticket.pivotId}`} className="text-emerald-800 hover:underline">
            {ticket.pivot.name}
          </Link>
          {" · "}
          {ticket.technician ? `Assigned to ${ticket.technician.name}` : "Unassigned"}
          {shopName ? ` · ${shopName}` : ""}
          {ticket.scheduledAt ? ` · Scheduled ${formatSchedule(ticket.scheduledAt)}` : ""}
        </p>

        {ticket.siteVisits.length > 0 ? (
          <section className="mt-6 rounded-xl border border-stone-200 bg-white p-4">
            <h2 className="font-display text-lg">On-site time (Reveal GPS)</h2>
            <p className="mt-1 text-sm text-stone-700">
              {formatDuration(visitMinutes(ticket.siteVisits) * 60_000)} billable on site
            </p>
            <ul className="mt-3 space-y-1 text-sm text-stone-600">
              {ticket.siteVisits.map((visit) => (
                <li key={visit.id}>
                  {new Date(visit.startedAt).toLocaleString()} –{" "}
                  {visit.endedAt ? new Date(visit.endedAt).toLocaleString() : "on site now"}
                  {visit.vehicleNumber ? ` · vehicle ${visit.vehicleNumber}` : ""}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <h2 className="font-display mt-8 text-xl">Updates</h2>
        <ol className="mt-3 space-y-3">
          {ticket.updates.map((update) => (
            <li key={update.id} className="rounded-lg border border-stone-200 bg-white p-3">
              <p className="text-xs text-stone-500">
                {update.user.name} · {new Date(update.createdAt).toLocaleString()}
                {update.status ? ` · ${STATUS_LABELS[update.status as keyof typeof STATUS_LABELS] ?? update.status}` : ""}
              </p>
              <p className="mt-1 text-sm text-stone-800">{update.message}</p>
              <TicketPhotoGrid photos={update.photos} />
            </li>
          ))}
        </ol>

        <ActionForm action={updateTicketAction} encType="multipart/form-data" className="mt-6 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
          <input type="hidden" name="ticketId" value={ticket.id} />
          {canDispatch ? (
            <>
              <TicketStatusFields
                status={ticket.status}
                invoiceNumber={ticket.invoiceNumber}
                invoiceAmount={ticket.invoiceAmount}
              />
              <label className="block text-sm font-medium">
                Scheduled for
                <input
                  name="scheduledAt"
                  type="datetime-local"
                  defaultValue={toDateTimeLocalValue(ticket.scheduledAt)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </label>
              <StoreSelect stores={stores} defaultValue={ticket.storeId ?? ticket.farmer.storeId} label="Store" />
              {canAssignTickets(session.role) ? (
                <label className="block text-sm font-medium">
                  Technician
                  <select name="technicianId" defaultValue={ticket.technicianId ?? ""} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2">
                    <option value="">Unassigned</option>
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
            {canDispatch ? "Work note" : "Add information"}
            <textarea
              name="message"
              rows={4}
              placeholder={
                canDispatch
                  ? "What was done, parts needed, follow-up…"
                  : "More detail for the service team: what you see, when it started, who to call on site…"
              }
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
          <TicketPhotoFields />
          <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
            {canDispatch ? "Save update" : "Add to ticket"}
          </button>
        </ActionForm>

        {ticket.photos.length > 0 ? (
          <section className="mt-8">
            <h2 className="font-display text-xl">Photos</h2>
            <TicketPhotoGrid photos={ticket.photos} />
          </section>
        ) : null}

        <h2 className="font-display mt-8 text-xl">Parts used</h2>
        <ul className="mt-3 divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200 bg-white">
          {ticket.parts.length === 0 ? (
            <li className="p-4 text-sm text-stone-600">No parts logged on this call yet.</li>
          ) : (
            ticket.parts.map((part) => (
              <li key={part.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span>
                  <span className="font-medium">{part.quantity} × {part.name}</span>
                  {part.sku ? <span className="text-stone-500"> · {part.sku}</span> : null}
                  {part.unitPrice != null ? (
                    <span className="text-stone-500"> · ${part.unitPrice.toFixed(2)} ea</span>
                  ) : null}
                </span>
                <span className="text-xs text-stone-500">
                  {part.user.name} · {new Date(part.createdAt).toLocaleString()}
                </span>
              </li>
            ))
          )}
        </ul>
        {canDispatch ? (
          <ActionForm action={addTicketPartAction} className="mt-3 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <PartsPicker />
            <label className="block text-sm font-medium">
              Custom name
              <input name="name" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" placeholder="Only if it is not in the catalog" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Quantity
                <input name="quantity" type="number" min="0.25" step="0.25" defaultValue="1" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium">
                SKU / bin
                <input name="sku" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" placeholder="Filled from catalog if selected" />
              </label>
            </div>
            <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Log part</button>
          </ActionForm>
        ) : null}

        <h2 className="font-display mt-8 text-xl">Labor</h2>
        <ul className="mt-3 divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200 bg-white">
          {ticket.labor.length === 0 ? (
            <li className="p-4 text-sm text-stone-600">No labor logged on this call yet.</li>
          ) : (
            ticket.labor.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span>
                  <span className="font-medium">{item.hours} hr × {item.name}</span>
                  {item.sku ? <span className="text-stone-500"> · {item.sku}</span> : null}
                  {item.unitRate != null ? (
                    <span className="text-stone-500"> · ${item.unitRate.toFixed(2)}/hr</span>
                  ) : null}
                </span>
                <span className="text-xs text-stone-500">
                  {item.user.name} · {new Date(item.createdAt).toLocaleString()}
                </span>
              </li>
            ))
          )}
        </ul>
        {canDispatch ? (
          <ActionForm action={addTicketLaborAction} className="mt-3 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <LaborPicker />
            <label className="block text-sm font-medium">
              Custom name
              <input name="name" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" placeholder="Only if it is not in the catalog" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Hours
                <input name="hours" type="number" min="0.25" step="0.25" defaultValue="1" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium">
                Code
                <input name="sku" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" placeholder="Filled from catalog if selected" />
              </label>
            </div>
            <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Log labor</button>
          </ActionForm>
        ) : null}

        <h2 className="font-display mt-8 text-xl">Equipment used</h2>
        <ul className="mt-3 divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200 bg-white">
          {ticket.equipment.length === 0 ? (
            <li className="p-4 text-sm text-stone-600">No equipment logged on this call yet.</li>
          ) : (
            ticket.equipment.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span>
                  <span className="font-medium">{item.hours} hr × {item.name}</span>
                  {item.sku ? <span className="text-stone-500"> · {item.sku}</span> : null}
                  {item.unitRate != null ? (
                    <span className="text-stone-500"> · ${item.unitRate.toFixed(2)}/hr</span>
                  ) : null}
                </span>
                <span className="text-xs text-stone-500">
                  {item.user.name} · {new Date(item.createdAt).toLocaleString()}
                </span>
              </li>
            ))
          )}
        </ul>
        {canDispatch ? (
          <ActionForm action={addTicketEquipmentAction} className="mt-3 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <EquipmentPicker />
            <label className="block text-sm font-medium">
              Custom name
              <input name="name" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" placeholder="Only if it is not in the catalog" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Hours
                <input name="hours" type="number" min="0.25" step="0.25" defaultValue="1" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium">
                Code
                <input name="sku" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" placeholder="Filled from catalog if selected" />
              </label>
            </div>
            <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Log equipment</button>
          </ActionForm>
        ) : null}
      </div>
      <div className="lg:col-span-2">
        <GoogleMapPanel
          markers={[
            {
              id: ticket.pivot.id,
              name: ticket.pivot.name,
              lat: ticket.pivot.latitude,
              lng: ticket.pivot.longitude,
              subtitle: ticket.farmer.name,
            },
          ]}
        />
      </div>
    </div>
  );
}
