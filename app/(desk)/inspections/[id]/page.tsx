import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { InspectionDeleteButton } from "@/components/InspectionDeleteButton";
import { PrintButton } from "@/components/PrintButton";
import { VisitSheets } from "@/components/VisitSheets";
import { getSession } from "@/lib/auth";
import { requireInspectionsAccess } from "@/lib/inspection-access";
import { isInspectionKind, readVisit } from "@/lib/inspection-form";
import { getInspection } from "@/lib/inspections";

export default async function InspectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requireInspectionsAccess(session);
  const { id } = await params;
  const query = await searchParams;
  const item = await getInspection(session, id);
  if (!item || !isInspectionKind(item.kind)) notFound();
  const visit = readVisit(item.headerJson, item.checksJson);
  visit.farmerId = item.farmerId;
  visit.deskPivotId = item.pivotId ?? "";

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href="/inspections" className="text-sm text-emerald-800">
          Inspections
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          {item.ticket ? (
            <Link href={`/tickets/${item.ticket.id}`} className="text-sm font-medium text-emerald-800">
              Work order #{item.ticket.number}
            </Link>
          ) : null}
          <Link href={`/inspections/${item.id}/edit`} className="text-sm font-medium text-emerald-800">
            Edit
          </Link>
          <PrintButton label="Print / PDF" />
          <InspectionDeleteButton id={item.id} />
        </div>
      </div>
      {query.saved ? (
        <p className="no-print rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Saved
          {item.pivotId ? (
            <>
              {" "}
              · on{" "}
              <Link href={`/pivots/${item.pivotId}`} className="font-semibold underline">
                the pivot asset
              </Link>
            </>
          ) : null}
          {item.ticket ? (
            <>
              {" "}
              · linked to{" "}
              <Link href={`/tickets/${item.ticket.id}`} className="font-semibold underline">
                work order #{item.ticket.number}
              </Link>
              {item.ticket.scheduledAt
                ? ` · scheduled ${item.ticket.scheduledAt.toLocaleDateString("en-US")}`
                : ""}
            </>
          ) : null}
          . Print / PDF uses the device print dialog.
        </p>
      ) : null}
      {query.error ? (
        <p className="no-print rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {query.error}
        </p>
      ) : null}
      <VisitSheets
        companyName={session.organizationName}
        customerName={item.customerName}
        inspectedOn={item.inspectedOn}
        inspectedBy={item.inspectedBy}
        visit={visit}
      />
    </div>
  );
}
