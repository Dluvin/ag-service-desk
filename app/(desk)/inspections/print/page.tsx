import Link from "next/link";
import { redirect } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { VisitSheets } from "@/components/VisitSheets";
import { getSession } from "@/lib/auth";
import { requireInspectionsAccess } from "@/lib/inspection-access";
import { isInspectionKind, readVisit } from "@/lib/inspection-form";
import { listInspections } from "@/lib/inspections";

export default async function InspectionsPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requireInspectionsAccess(session);
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const rows = await listInspections(session, q);

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href={q ? `/inspections?q=${encodeURIComponent(q)}` : "/inspections"} className="text-sm text-emerald-800">
          Back to inspections
        </Link>
        <PrintButton label="Print / PDF" />
      </div>
      {rows.length === 0 ? <p className="text-stone-600">No inspections to print.</p> : null}
      {rows.map((row) => {
        if (!isInspectionKind(row.kind) || row.kind !== "visit") return null;
        const visit = readVisit(row.headerJson, row.checksJson);
        return (
          <div key={row.id} className="print-page">
            <VisitSheets
              companyName={session.organizationName}
              customerName={row.customerName}
              inspectedOn={row.inspectedOn}
              inspectedBy={row.inspectedBy}
              visit={visit}
            />
          </div>
        );
      })}
    </div>
  );
}
