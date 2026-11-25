import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { orgInspectionsIsOn } from "@/lib/ocr-samples";
import { factsFromPackage, findPackagesBySerial, indexPivotPackages } from "@/lib/pivot-package-match";
import { loadPivotPackages } from "@/lib/pivot-packages-data";

const cache = new Map<string, { at: number; index: ReturnType<typeof indexPivotPackages> }>();

async function packageIndex(organizationId: string) {
  const now = Date.now();
  const hit = cache.get(organizationId);
  if (hit && now - hit.at < 60_000) return hit.index;
  const packages = await loadPivotPackages(organizationId);
  const index = indexPivotPackages(packages);
  cache.set(organizationId, { at: now, index });
  return index;
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await orgInspectionsIsOn(session.organizationId))) {
    return NextResponse.json({ error: "Pivot inspections are not enabled." }, { status: 403 });
  }
  const serial = new URL(request.url).searchParams.get("serial")?.trim() ?? "";
  if (serial.length < 3) return NextResponse.json({ matches: [] });
  const index = await packageIndex(session.organizationId);
  const matches = findPackagesBySerial(index, serial).map((pkg) => {
    const facts = factsFromPackage(pkg.description);
    return {
      item: pkg.item,
      description: pkg.description,
      brand: facts.brand,
      towerCount: facts.towerCount,
    };
  });
  return NextResponse.json({ matches });
}
