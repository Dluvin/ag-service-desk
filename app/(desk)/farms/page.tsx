import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isShopStaff, ROLES } from "@/lib/roles";
import { AddAssetToFarmPanel } from "@/components/AddAssetToFarmPanel";
import { FarmsDirectory } from "@/components/FarmsDirectory";
import { UNASSIGNED_FARM_LABEL } from "@/lib/farms";

export default async function FarmsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === ROLES.FARMER && session.farmerId) {
    redirect(`/farmers/${session.farmerId}`);
  }
  if (session.role === ROLES.FARMER) redirect("/dashboard");

  const [farms, pivots, assets] = await Promise.all([
    prisma.farm.findMany({
      where: { organizationId: session.organizationId },
      include: {
        farmer: { select: { id: true, name: true } },
        _count: { select: { pivots: true, assets: true } },
      },
      orderBy: [{ name: "asc" }, { farmer: { name: "asc" } }],
    }),
    prisma.pivot.findMany({
      where: { organizationId: session.organizationId },
      select: {
        id: true,
        name: true,
        serialNumber: true,
        farmerId: true,
        farmer: { select: { name: true } },
        farm: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.asset.findMany({
      where: { organizationId: session.organizationId },
      select: {
        id: true,
        name: true,
        farmerId: true,
        farmer: { select: { name: true } },
        farm: { select: { name: true } },
        assetType: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);
  const canManage = isShopStaff(session.role);

  return (
    <div>
      <h1 className="font-display text-3xl">Farms</h1>
      <p className="mt-1 text-sm text-stone-600">All farms for this company. Open a farm to manage it on the customer.</p>
      {canManage ? (
        <AddAssetToFarmPanel
          showCustomer
          farms={farms.map((farm) => ({
            farmId: farm.id,
            farmName: farm.name,
            farmerId: farm.farmer.id,
            farmerName: farm.farmer.name,
          }))}
          assets={[
            ...pivots.map((pivot) => ({
              kind: "pivot" as const,
              id: pivot.id,
              name: pivot.name,
              typeName: "Pivots",
              farmName: pivot.farm?.name ?? UNASSIGNED_FARM_LABEL,
              farmerId: pivot.farmerId,
              farmerName: pivot.farmer.name,
              serialNumber: pivot.serialNumber,
            })),
            ...assets.map((asset) => ({
              kind: "asset" as const,
              id: asset.id,
              name: asset.name,
              typeName: asset.assetType.name,
              farmName: asset.farm?.name ?? UNASSIGNED_FARM_LABEL,
              farmerId: asset.farmerId,
              farmerName: asset.farmer.name,
            })),
          ]}
        />
      ) : null}
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
