"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "./auth";
import { parseMoneyInput } from "./money";
import { orgInspectionsIsOn } from "./ocr-samples";
import {
  createSalesPackage,
  PACKAGE_KINDS,
  type PackageKind,
} from "./pivot-packages-data";
import { syncPivotPackagesForOrganization } from "./pivot-package-sync";
import { canImportPivots, canManageParts } from "./roles";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

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

export async function createPivotPackageAction(formData: FormData) {
  const session = await requireSession();
  if (!canManageParts(session.role)) {
    return { error: "Only admins, managers, and sales can create packages." };
  }

  const kindRaw = formString(formData, "kind").toUpperCase();
  if (kindRaw !== PACKAGE_KINDS.PIVOT && kindRaw !== PACKAGE_KINDS.SPRINKLER) {
    return { error: "Choose pivot or sprinkler package." };
  }
  const kind: PackageKind = kindRaw;

  const item = formString(formData, "item");
  const description = formString(formData, "description");
  if (!item) return { error: "Item number is required." };
  if (!description) return { error: "Description is required." };

  try {
    await createSalesPackage({
      organizationId: session.organizationId,
      kind,
      item,
      description,
      purchaseDescription: formString(formData, "purchaseDescription"),
      qty: formString(formData, "qty") || "0",
      uom: formString(formData, "uom") || "each (ea)",
      cost: parseMoneyInput(formString(formData, "cost")) ?? 0,
      price: parseMoneyInput(formString(formData, "price")) ?? 0,
      vendor: formString(formData, "vendor"),
      mpn: formString(formData, "mpn"),
      barcode: formString(formData, "barcode"),
      reference: formString(formData, "reference"),
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create package." };
  }

  revalidatePath("/sales/packages");
  revalidatePath("/pivots");
  redirect(`/sales/packages?item=${encodeURIComponent(item)}&created=1`);
}
