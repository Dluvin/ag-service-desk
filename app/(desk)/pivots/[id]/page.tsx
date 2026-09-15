import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pivotWhere } from "@/lib/scope";
import { ROLES } from "@/lib/roles";
import { GoogleMapPanel } from "@/components/GoogleMapPanel";
import { StatusBadge } from "@/components/Badges";
import { addPivotNoteAction, updatePivotAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { MapLocationPicker } from "@/components/MapLocationPicker";

export default async function PivotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;

  const pivot = await prisma.pivot.findFirst({
    where: { id, ...pivotWhere(session) },
    include: { farmer: true, tickets: { orderBy: { updatedAt: "desc" } }, notes: { include: { user: true }, orderBy: { createdAt: "desc" } } },
  });
  if (!pivot) notFound();

  const canEdit = session.role === ROLES.ADMIN || session.role === ROLES.TECHNICIAN;
  const farms = canEdit
    ? await prisma.farmer.findMany({
        where: { organizationId: session.organizationId },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : [];

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <h1 className="font-display text-3xl">{pivot.name}</h1>
        <p className="text-stone-600">
          <Link href={`/farmers/${pivot.farmerId}`} className="text-emerald-800 hover:underline">
            {pivot.farmer.name}
          </Link>
          {pivot.serialNumber ? ` · SN ${pivot.serialNumber}` : ""}
        </p>
        {pivot.locationNote ? <p className="mt-2 text-sm">{pivot.locationNote}</p> : null}
        {canEdit ? (
          <ActionForm action={updatePivotAction} className="mt-6 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
            <input type="hidden" name="pivotId" value={pivot.id} />
            <h2 className="font-display text-xl">Edit pivot</h2>
            <label className="block text-sm font-medium">
              Farm
              <select name="farmerId" defaultValue={pivot.farmerId} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2">
                {farms.map((farm) => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Pivot name
              <input name="name" required defaultValue={pivot.name} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
            </label>
            <label className="block text-sm font-medium">
              Serial number
              <input name="serialNumber" defaultValue={pivot.serialNumber ?? ""} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
            </label>
            <label className="block text-sm font-medium">
              Location note
              <input name="locationNote" defaultValue={pivot.locationNote ?? ""} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
            </label>
            <MapLocationPicker
              apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || undefined}
              defaultLat={pivot.latitude}
              defaultLng={pivot.longitude}
            />
            <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Save pivot</button>
          </ActionForm>
        ) : null}
        <p className="mt-3 text-sm">
          <Link href="/startup" className="text-emerald-800 hover:underline">
            Pre-season startup checklist
          </Link>
        </p>

        <h2 className="font-display mt-8 text-xl">Notes</h2>
        <ul className="mt-3 divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200 bg-white">
          {pivot.notes.length === 0 ? (
            <li className="p-4 text-sm text-stone-600">No notes on this pivot yet.</li>
          ) : (
            pivot.notes.map((note) => (
              <li key={note.id} className="px-4 py-3">
                <p className="text-xs text-stone-500">
                  {note.user.name} · {new Date(note.createdAt).toLocaleString()}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-stone-800">{note.message}</p>
              </li>
            ))
          )}
        </ul>
        <ActionForm action={addPivotNoteAction} className="mt-3 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
          <input type="hidden" name="pivotId" value={pivot.id} />
          <label className="block text-sm font-medium">
            Add a note
            <textarea
              name="message"
              rows={3}
              required
              placeholder="Access, span issues, last service, farmer requests…"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
          <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Save note</button>
        </ActionForm>

        <h2 className="font-display mt-8 text-xl">Tickets</h2>
        <ul className="mt-3 divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200 bg-white">
          {pivot.tickets.length === 0 ? (
            <li className="p-4 text-sm text-stone-600">No tickets yet.</li>
          ) : (
            pivot.tickets.map((ticket) => (
              <li key={ticket.id} className="flex items-center justify-between px-4 py-3">
                <Link href={`/tickets/${ticket.id}`} className="font-medium hover:underline">
                  #{ticket.number} {ticket.title}
                </Link>
                <StatusBadge status={ticket.status} />
              </li>
            ))
          )}
        </ul>
        <Link
          href={session.role === ROLES.FARMER ? `/tickets/new?pivotId=${pivot.id}` : "/tickets/new"}
          className="mt-4 inline-block text-sm font-semibold text-emerald-800"
        >
          Open a ticket for this pivot
        </Link>
      </div>
      <div className="lg:col-span-2">
        <GoogleMapPanel
          markers={[
            {
              id: pivot.id,
              name: pivot.name,
              lat: pivot.latitude,
              lng: pivot.longitude,
              subtitle: pivot.farmer.name,
            },
          ]}
        />
      </div>
    </div>
  );
}
