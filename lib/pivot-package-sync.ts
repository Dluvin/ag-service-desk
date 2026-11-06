import {
  findExactPackageForPivot,
  indexPivotPackages,
  packageFieldsFromMatch,
} from "./pivot-package-match";
import { loadPivotPackages } from "./pivot-packages-data";
import { prisma } from "./prisma";

export type PivotPackageSyncResult = {
  scanned: number;
  matched: number;
  updated: number;
  skippedExisting: number;
  byHow: { serial: number; pivotName: number };
};

export async function syncPivotPackagesForOrganization(
  organizationId: string,
  options?: { overwrite?: boolean },
): Promise<PivotPackageSyncResult> {
  const overwrite = options?.overwrite === true;
  const packages = await loadPivotPackages();
  const index = indexPivotPackages(packages);
  const pivots = await prisma.pivot.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      serialNumber: true,
      packageItem: true,
    },
  });

  const result: PivotPackageSyncResult = {
    scanned: pivots.length,
    matched: 0,
    updated: 0,
    skippedExisting: 0,
    byHow: { serial: 0, pivotName: 0 },
  };

  for (const pivot of pivots) {
    const match = findExactPackageForPivot(index, {
      name: pivot.name,
      serialNumber: pivot.serialNumber,
    });
    if (!match) continue;
    result.matched += 1;
    result.byHow[match.how] += 1;
    if (pivot.packageItem && !overwrite) {
      result.skippedExisting += 1;
      continue;
    }
    await prisma.pivot.update({
      where: { id: pivot.id },
      data: packageFieldsFromMatch(match.pkg),
    });
    result.updated += 1;
  }

  return result;
}
