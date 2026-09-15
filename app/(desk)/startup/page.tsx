import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pivotWhere } from "@/lib/scope";
import { ROLES } from "@/lib/roles";
import { startStartupInspectionAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { INSPECTION_STATUS, STARTUP_SEASON_YEAR, inspectionLabel } from "@/lib/startup";

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

  const canInspect = session.role !== ROLES.FARMER;

  return (
    <div>
      <h1 className="font-display text-3xl">{STARTUP_SEASON_YEAR} pre-season startup</h1>
      <p className="mt-1 text-stone-600">
        Checklist per pivot. A failed item opens a high-priority service ticket automatically.
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-2">Pivot</th>
              <th className="px-4 py-2">Farmer</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {pivots.map((pivot) => {
              const inspection = pivot.inspections[0];
              const status = inspection?.status ?? INSPECTION_STATUS.NOT_STARTED;
              return (
                <tr key={pivot.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 font-medium">{pivot.name}</td>
                  <td className="px-4 py-3 text-stone-600">{pivot.farmer.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        status === INSPECTION_STATUS.PASSED
                          ? "bg-emerald-100 text-emerald-900"
                          : status === INSPECTION_STATUS.FAILED
                            ? "bg-red-100 text-red-900"
                            : status === INSPECTION_STATUS.IN_PROGRESS
                              ? "bg-amber-100 text-amber-950"
                              : "bg-stone-100 text-stone-700"
                      }`}
                    >
                      {inspectionLabel(status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {inspection ? (
                      <Link href={`/startup/${inspection.id}`} className="text-emerald-800 hover:underline">
                        Open checklist
                      </Link>
                    ) : canInspect ? (
                      <ActionForm action={startStartupInspectionAction}>
                        <input type="hidden" name="pivotId" value={pivot.id} />
                        <button className="text-emerald-800 hover:underline">Start inspection</button>
                      </ActionForm>
                    ) : (
                      <span className="text-stone-400">Waiting on shop</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
