import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pivotWhere } from "@/lib/scope";
import { ROLES } from "@/lib/roles";
import { saveStartupChecksAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { STARTUP_CHECKS, inspectionLabel } from "@/lib/startup";
import { GoogleMapPanel } from "@/components/GoogleMapPanel";

export default async function StartupInspectionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;

  const inspection = await prisma.startupInspection.findFirst({
    where: { id, organizationId: session.organizationId },
    include: {
      pivot: { include: { farmer: true } },
      checks: true,
      ticket: true,
      inspector: true,
    },
  });
  if (!inspection) notFound();

  const allowed = await prisma.pivot.findFirst({
    where: { id: inspection.pivotId, ...pivotWhere(session) },
  });
  if (!allowed) notFound();

  const canEdit = session.role !== ROLES.FARMER;
  const byKey = Object.fromEntries(inspection.checks.map((check) => [check.checkKey, check]));

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <p className="text-sm text-stone-500">
          <Link href="/startup" className="hover:underline">
            {inspection.seasonYear} startup
          </Link>
        </p>
        <h1 className="font-display text-3xl">{inspection.pivot.name}</h1>
        <p className="text-stone-600">
          {inspection.pivot.farmer.name}
          {inspection.inspector ? ` · Inspector ${inspection.inspector.name}` : ""}
        </p>
        <p className="mt-2 text-sm font-medium">{inspectionLabel(inspection.status)}</p>
        {inspection.ticket ? (
          <p className="mt-2 text-sm">
            Auto-opened{" "}
            <Link href={`/tickets/${inspection.ticket.id}`} className="text-emerald-800 hover:underline">
              ticket #{inspection.ticket.number}
            </Link>
          </p>
        ) : null}

        <ActionForm action={saveStartupChecksAction} className="mt-6 space-y-4">
          <input type="hidden" name="inspectionId" value={inspection.id} />
          {STARTUP_CHECKS.map((item) => {
            const current = byKey[item.key];
            return (
              <fieldset key={item.key} className="rounded-xl border border-stone-200 bg-white p-4">
                <legend className="px-1 text-sm font-semibold">{item.label}</legend>
                <p className="text-xs text-stone-500">{item.detail}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  {(["PASS", "FAIL", "PENDING"] as const).map((result) => (
                    <label key={result} className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        name={`result_${item.key}`}
                        value={result}
                        defaultChecked={(current?.result ?? "PENDING") === result}
                        disabled={!canEdit}
                      />
                      {result === "PASS" ? "Pass" : result === "FAIL" ? "Fail" : "Pending"}
                    </label>
                  ))}
                </div>
                <input
                  name={`notes_${item.key}`}
                  defaultValue={current?.notes ?? ""}
                  disabled={!canEdit}
                  placeholder="Notes"
                  className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm disabled:bg-stone-50"
                />
              </fieldset>
            );
          })}
          {canEdit ? (
            <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
              Save checklist
            </button>
          ) : (
            <p className="text-sm text-stone-500">Your shop team fills this checklist. Failed items become tickets you can follow.</p>
          )}
        </ActionForm>
      </div>
      <div className="lg:col-span-2">
        <GoogleMapPanel
          markers={[
            {
              id: inspection.pivot.id,
              name: inspection.pivot.name,
              lat: inspection.pivot.latitude,
              lng: inspection.pivot.longitude,
              subtitle: inspection.pivot.farmer.name,
            },
          ]}
        />
      </div>
    </div>
  );
}
