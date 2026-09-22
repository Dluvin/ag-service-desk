import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { FarmsDirectory } from "@/components/FarmsDirectory";

export default async function FarmsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === ROLES.FARMER && session.farmerId) {
    redirect(`/farmers/${session.farmerId}`);
  }
  if (session.role === ROLES.FARMER) redirect("/dashboard");

  const farms = await prisma.farm.findMany({
    where: { organizationId: session.organizationId },
    include: {
      farmer: { select: { id: true, name: true } },
      _count: { select: { pivots: true, assets: true } },
    },
    orderBy: [{ name: "asc" }, { farmer: { name: "asc" } }],
  });

  return (
    <div>
      <h1 className="font-display text-3xl">Farms</h1>
      <p className="mt-1 text-sm text-stone-600">All farms for this company. Open a farm to manage it on the customer.</p>
      <FarmsDirectory
        farms={farms.map((farm) => ({
          id: farm.id,
          name: farm.name,
          location: farm.location,
          customerId: farm.farmer.id,
          customerName: farm.farmer.name,
          pivotCount: farm._count.pivots,
          assetCount: farm._count.assets,
        }))}
      />
    </div>
  );
}
