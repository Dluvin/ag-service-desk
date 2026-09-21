import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { createPivotAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { NewPivotFields } from "@/components/NewPivotFields";

export default async function NewPivotPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === ROLES.FARMER) redirect("/pivots");

  const [farmers, farms] = await Promise.all([
    prisma.farmer.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.farm.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, farmerId: true },
    }),
  ]);

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl">Add pivot</h1>
      <p className="mt-1 text-sm text-stone-600">
        Pick an existing customer or add a new one, then click the map to set the location.
      </p>
      <ActionForm action={createPivotAction} className="mt-6 space-y-4 rounded-xl border border-stone-200 bg-white p-6">
        <NewPivotFields
          farmers={farmers}
          farms={farms}
          mapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || undefined}
        />
        <button className="rounded-lg bg-emerald-800 px-4 py-2 font-semibold text-white">Save pivot</button>
      </ActionForm>
    </div>
  );
}
