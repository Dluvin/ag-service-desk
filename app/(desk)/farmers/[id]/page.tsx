import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES, canDeleteRecords, isShopStaff } from "@/lib/roles";
import { addFarmerContactAction, deleteFarmerAction, deleteFarmerContactAction, updateFarmerAction, updateFarmerContactAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { DeleteButton } from "@/components/DeleteButton";
import { SelectableMap } from "@/components/SelectableMap";
import { StatusBadge } from "@/components/Badges";

export default async function FarmerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;

  if (session.role === ROLES.FARMER && session.farmerId !== id) notFound();

  const farmer = await prisma.farmer.findFirst({
    where: { id, organizationId: session.organizationId },
    include: {
      contacts: { orderBy: { name: "asc" } },
      pivots: { orderBy: { name: "asc" } },
      tickets: { include: { pivot: true }, orderBy: { updatedAt: "desc" }, take: 12 },
    },
  });
  if (!farmer) notFound();

  const canEdit = isShopStaff(session.role);

  return (
    <div>
      <h1 className="font-display text-3xl">{farmer.name}</h1>
      {farmer.address ? <p className="text-stone-600">{farmer.address}</p> : null}
      {canDeleteRecords(session.role) ? (
        <div className="mt-3">
          <DeleteButton
            action={deleteFarmerAction}
            name="farmerId"
            value={farmer.id}
            label="Delete farm"
            confirmText={`Delete ${farmer.name} and its pivots and tickets? This cannot be undone.`}
          />
        </div>
      ) : null}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SelectableMap
          markers={farmer.pivots.map((pivot) => ({
            id: pivot.id,
            name: pivot.name,
            lat: pivot.latitude,
            lng: pivot.longitude,
            subtitle: pivot.serialNumber ?? undefined,
          }))}
        />
        <div>
          {canEdit ? (
            <ActionForm action={updateFarmerAction} className="mb-6 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
              <input type="hidden" name="farmerId" value={farmer.id} />
              <h2 className="font-display text-xl">Edit farm</h2>
              <label className="block text-sm font-medium">
                Farm name
                <input name="name" required defaultValue={farmer.name} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium">
                Address
                <input name="address" defaultValue={farmer.address ?? ""} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
              </label>
              <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Save farm</button>
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
      <h2 className="font-display mt-8 text-xl">Pivots ({farmer.pivots.length})</h2>
      {farmer.pivots.length ? (
        <ul
          className={
            farmer.pivots.length > 8
              ? "mt-3 columns-2 gap-x-8 sm:columns-3 lg:columns-4"
              : farmer.pivots.length > 4
                ? "mt-3 columns-2 gap-x-8"
                : "mt-3"
          }
        >
          {farmer.pivots.map((pivot) => (
            <li key={pivot.id} className="break-inside-avoid py-1">
              <Link href={`/pivots/${pivot.id}`} className="text-emerald-800 hover:underline">
                {pivot.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-stone-600">No pivots on this farm yet.</p>
      )}
      <h2 className="font-display mt-8 text-xl">Tickets</h2>
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
