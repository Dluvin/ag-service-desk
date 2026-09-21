import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pivotWhere } from "@/lib/scope";
import { canEditStartupChecklist, ROLES } from "@/lib/roles";
import { INSPECTION_STATUS, STARTUP_SEASON_YEAR, inspectionLabel } from "@/lib/startup";
import { MaintenanceBoard } from "@/components/MaintenanceBoard";

export default async function StartupBoardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const pivots = await prisma.pivot.findMany({
    where: pivotWhere(session),
    include: {
      farmer: true,
      inspections: { where: { seasonYear: STARTUP_SEASON_YEAR } },
    },
    orderBy: [{ farmer: { name: "asc" } }, { name: "asc" }],
  });

  return (
    <div>
      <h1 className="font-display text-3xl">{STARTUP_SEASON_YEAR} maintenance</h1>
      <p className="mt-1 text-stone-600">
        Pick a customer or search, then select a pivot to open a maintenance work order. The checklist stays on
        that visit; failed items mark the work order high priority.
      </p>
      {canEditStartupChecklist(session.role) ? (
        <p className="mt-2 text-sm">
          <Link href="/startup/checklist" className="font-semibold text-emerald-800 hover:underline">
            Add or remove checklist items
          </Link>
        </p>
      ) : null}
      <MaintenanceBoard
        canInspect={session.role !== ROLES.FARMER}
        pivots={pivots.map((pivot) => {
          const inspection = pivot.inspections[0];
          const status = inspection?.status ?? INSPECTION_STATUS.NOT_STARTED;
          return {
            id: pivot.id,
            name: pivot.name,
            farmerId: pivot.farmerId,
            farmerName: pivot.farmer.name,
            serialNumber: pivot.serialNumber,
            status,
            statusLabel: inspectionLabel(status),
            inspectionId: inspection?.id ?? null,
            ticketId: inspection?.ticketId ?? null,
          };
        })}
      />
    </div>
  );
}
