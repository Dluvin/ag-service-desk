"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "./auth";
import { orgInspectionsIsOn } from "./ocr-samples";
import { syncPivotPackagesForOrganization } from "./pivot-package-sync";
import { canImportPivots } from "./roles";

export async function syncPivotPackagesAction() {
  const session = await requireSession();
  if (!canImportPivots(session.role)) {
    redirect("/pivots?packagesError=" + encodeURIComponent("Only managers can sync pivot packages."));
  }
  if (!(await orgInspectionsIsOn(session.organizationId))) {
    redirect("/pivots?packagesError=" + encodeURIComponent("Turn on pivot inspections for this company first."));
  }
  const result = await syncPivotPackagesForOrganization(session.organizationId);
  revalidatePath("/pivots");
  revalidatePath("/assets");
  revalidatePath("/inspections");
  redirect(
    `/pivots?packagesMatched=${result.matched}&packagesUpdated=${result.updated}&packagesSkipped=${result.skippedExisting}`,
  );
}
