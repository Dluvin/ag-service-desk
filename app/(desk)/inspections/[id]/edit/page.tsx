import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { InspectionWizard } from "@/components/InspectionWizard";
import { getSession } from "@/lib/auth";
import { requireInspectionsAccess } from "@/lib/inspection-access";
import { isInspectionKind, readVisit } from "@/lib/inspection-form";
import { getInspection, loadInspectionCustomers } from "@/lib/inspections";
import { orgQbCustomerListIsOn } from "@/lib/ocr-samples";

export default async function EditInspectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; step?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requireInspectionsAccess(session);
  const { id } = await params;
  const query = await searchParams;
  const item = await getInspection(session, id);
  if (!item || !isInspectionKind(item.kind) || item.kind !== "visit") notFound();
  const customerSource = (await orgQbCustomerListIsOn(session.organizationId)) ? "quickbooks" : "static";
  const customers = await loadInspectionCustomers(session);
  const visit = readVisit(item.headerJson, item.checksJson);
  visit.farmerId = item.farmerId;
  visit.deskPivotId = item.pivotId ?? "";
  visit.inspectedOn = item.inspectedOn;
  visit.inspectedBy = item.inspectedBy;
  const requested = Number(query.step ?? "0");
  const step = Number.isInteger(requested) ? Math.min(Math.max(requested, 0), visit.towerCount + 1) : 0;

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-4">
      <p className="text-sm text-stone-500">
        <Link href={`/inspections/${item.id}`} className="text-emerald-800">
          Inspection
        </Link>
      </p>
      {query.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{query.error}</p>
      ) : null}
      <InspectionWizard
        organizationId={session.organizationId}
        customerSource={customerSource}
        customers={customers}
        visit={visit}
        id={item.id}
        initialStep={step}
      />
    </div>
  );
}
