import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { orgInspectionsIsOn } from "@/lib/ocr-samples";
import { factsFromPackage, findPackagesBySerial, indexPivotPackages } from "@/lib/pivot-package-match";
import { loadPivotPackages } from "@/lib/pivot-packages-data";

let cache: { at: number; index: ReturnType<typeof indexPivotPackages> } | null = null;

async function packageIndex() {
  const now = Date.now();
  if (cache && now - cache.at < 60_000) return cache.index;
  const packages = await loadPivotPackages();
  const index = indexPivotPackages(packages);
  cache = { at: now, index };
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
  const index = await packageIndex();
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
