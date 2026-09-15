import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pivotWhere } from "@/lib/scope";
import { GoogleMapPanel } from "@/components/GoogleMapPanel";
import { StatusBadge } from "@/components/Badges";
import { addPivotNoteAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";

export default async function PivotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;

  const pivot = await prisma.pivot.findFirst({
    where: { id, ...pivotWhere(session) },
    include: { farmer: true, tickets: { orderBy: { updatedAt: "desc" } }, notes: { include: { user: true }, orderBy: { createdAt: "desc" } } },
  });
  if (!pivot) notFound();

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
        <Link href="/tickets/new" className="mt-4 inline-block text-sm font-semibold text-emerald-800">
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
