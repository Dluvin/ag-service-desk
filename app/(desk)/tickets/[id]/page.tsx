import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadTechnicians, ticketWhere } from "@/lib/scope";
import { ROLES, STATUS_LABELS } from "@/lib/roles";
import { updateTicketAction, addTicketPartAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { GoogleMapPanel } from "@/components/GoogleMapPanel";
import { PriorityBadge, StatusBadge } from "@/components/Badges";
import { TicketStatusFields } from "@/components/TicketStatusFields";
import { PartsPicker } from "@/components/PartsPicker";
import { formatDuration, visitMinutes } from "@/lib/onsite";

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;

  const ticket = await prisma.ticket.findFirst({
    where: { id, ...ticketWhere(session) },
    include: {
      farmer: true,
      pivot: true,
      technician: true,
      updates: { include: { user: true }, orderBy: { createdAt: "asc" } },
      parts: { include: { user: true }, orderBy: { createdAt: "asc" } },
      siteVisits: { orderBy: { startedAt: "asc" } },
    },
  });
  if (!ticket) notFound();

  const technicians = session.role === ROLES.ADMIN ? await loadTechnicians(session.organizationId) : [];
  const catalogParts =
    session.role === ROLES.FARMER
      ? []
      : await prisma.catalogPart.findMany({
          where: { organizationId: session.organizationId, active: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, sku: true, price: true },
        });
  const canDispatch = session.role === ROLES.ADMIN || session.role === ROLES.TECHNICIAN;

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <p className="text-sm text-stone-500">Ticket #{ticket.number}</p>
        <h1 className="font-display text-3xl">{ticket.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          {ticket.invoiceNumber ? (
            <span className="text-sm font-medium text-stone-700">Invoice {ticket.invoiceNumber}</span>
          ) : null}
          {ticket.status === "COMPLETED" && ticket.invoiceNumber ? (
            <Link href={`/tickets/${ticket.id}/print`} className="text-sm font-semibold text-emerald-800 hover:underline">
              Print / Save PDF
            </Link>
          ) : null}
        </div>
        <p className="mt-4 whitespace-pre-wrap text-stone-700">{ticket.description}</p>
        <p className="mt-3 text-sm text-stone-600">
          <Link href={`/farmers/${ticket.farmerId}`} className="text-emerald-800 hover:underline">
            {ticket.farmer.name}
          </Link>
          {" · "}
          <Link href={`/pivots/${ticket.pivotId}`} className="text-emerald-800 hover:underline">
            {ticket.pivot.name}
          </Link>
          {" · "}
          {ticket.technician ? `Assigned to ${ticket.technician.name}` : "Unassigned"}
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
            </li>
          ))}
        </ol>

        <ActionForm action={updateTicketAction} className="mt-6 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
          <input type="hidden" name="ticketId" value={ticket.id} />
          {canDispatch ? (
            <>
              <TicketStatusFields status={ticket.status} invoiceNumber={ticket.invoiceNumber} />
              {session.role === ROLES.ADMIN ? (
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
            {canDispatch ? "Work note" : "Message to the service team"}
            <textarea name="message" rows={3} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
            {canDispatch ? "Save update" : "Send update"}
          </button>
        </ActionForm>

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
            <PartsPicker parts={catalogParts} />
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
