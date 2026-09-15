import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { createPivotAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";

export default async function NewPivotPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === ROLES.FARMER) redirect("/pivots");

  const farmers = await prisma.farmer.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-3xl">Add pivot</h1>
      <p className="mt-1 text-sm text-stone-600">
        Paste a Google Maps link or coordinates. Example: 40.86840, -97.59190 or a maps URL with @lat,lng.
      </p>
      <ActionForm action={createPivotAction} className="mt-6 space-y-4 rounded-xl border border-stone-200 bg-white p-6">
        <label className="block text-sm font-medium">
          Farmer / client
          <select name="farmerId" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2">
            <option value="">Select farmer</option>
            {farmers.map((farmer) => (
              <option key={farmer.id} value={farmer.id}>
                {farmer.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Pivot name
          <input name="name" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
        </label>
        <label className="block text-sm font-medium">
          Serial number
          <input name="serialNumber" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
        </label>
        <label className="block text-sm font-medium">
          Google Maps link or lat,lng
          <input name="mapsInput" placeholder="https://maps.google.com/... or 40.86, -97.59" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium">
            Latitude
            <input name="latitude" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            Longitude
            <input name="longitude" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
        </div>
        <label className="block text-sm font-medium">
          Location note
          <input name="locationNote" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
        </label>
        <button className="rounded-lg bg-emerald-800 px-4 py-2 font-semibold text-white">Save pivot</button>
      </ActionForm>
    </div>
  );
}
