import Link from "next/link";
import { redirect } from "next/navigation";
import { InspectionWizard } from "@/components/InspectionWizard";
import { getSession } from "@/lib/auth";
import { inspectionToday, type VisitDraft } from "@/lib/inspection-form";
import { loadInspectionCustomers } from "@/lib/inspections";
import { ROLES } from "@/lib/roles";

export default async function NewInspectionPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === ROLES.FARMER) redirect("/dashboard");
  const customers = await loadInspectionCustomers(session);
  const visit: VisitDraft = {
    farmerId: "",
    deskPivotId: "",
    inspectedOn: inspectionToday(),
    inspectedBy: session.name,
    serialNumber: "",
    brand: "Valley",
    towerCount: 1,
    packageItem: "",
    packageDescription: "",
    pivotId: "",
    modelNumber: "",
    fuseSize: "",
    hours: "",
    pointChecks: {},
    towers: [],
  };

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-4">
      <p className="text-sm text-stone-500">
        <Link href="/inspections" className="text-emerald-800">
          Inspections
        </Link>
      </p>
      <InspectionWizard customers={customers} visit={visit} />
    </div>
  );
}
