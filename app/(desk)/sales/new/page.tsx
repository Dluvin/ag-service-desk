import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { homePath } from "@/lib/home";
import { ensureAssetTypes } from "@/lib/assets";
import { createSaleAction } from "@/lib/sale-actions";
import { ActionForm } from "@/components/ActionForm";
import { SaleFormFields } from "@/components/SaleFormFields";

export default async function NewSalePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === ROLES.FARMER) redirect(homePath(session.role));

  const [farmers, farms, stores, salespeople, assetTypes, actor] = await Promise.all([
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
    prisma.store.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: {
        organizationId: session.organizationId,
        role: { in: [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALESPERSON] },
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
    ensureAssetTypes(session.organizationId),
    prisma.user.findFirst({
      where: { id: session.userId },
      select: { id: true, name: true, storeId: true, role: true },
    }),
  ]);
  const actorIsSalesman =
    actor?.role === ROLES.ADMIN ||
    actor?.role === ROLES.MANAGER ||
    actor?.role === ROLES.SALESPERSON;

  return (
    <div className="max-w-3xl">
      <p className="text-sm">
        <Link href="/sales" className="text-emerald-800 hover:underline">
          Sales
        </Link>
      </p>
      <h1 className="font-display mt-1 text-3xl">New sale</h1>
      <p className="mt-1 text-sm text-stone-600">
        Log a prospect with the same fields as the Pivot Prospects workbook. No sheet data is imported.
      </p>
      <ActionForm action={createSaleAction} className="mt-6 space-y-4 rounded-xl border border-stone-200 bg-white p-6">
        <SaleFormFields
          farmers={farmers}
          farms={farms}
          stores={stores}
          salespeople={salespeople}
          assetTypes={assetTypes}
          mapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || undefined}
          defaults={{
            salesmanUserId: actorIsSalesman ? actor?.id : undefined,
            salesmanName: actorIsSalesman ? actor?.name : undefined,
            storeId: actor?.storeId,
            lastContactAt: new Date(),
            status: "LEAD",
            assetTypeSlug: "pivots",
          }}
        />
        <div className="flex flex-wrap gap-2">
          <button className="rounded-lg bg-emerald-800 px-4 py-2 font-semibold text-white">Save sale</button>
          <Link
            href="/sales"
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50"
          >
            Cancel
          </Link>
        </div>
      </ActionForm>
    </div>
  );
}
