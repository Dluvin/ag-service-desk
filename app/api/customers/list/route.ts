import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { loadInspectionCustomers } from "@/lib/inspections";
import { orgQbCustomerListIsOn } from "@/lib/ocr-samples";
import { loadQbCustomerOptions } from "@/lib/qb-customers";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const useQb = await orgQbCustomerListIsOn(session.organizationId);
  if (useQb) {
    const { customers, syncedAt } = await loadQbCustomerOptions(session.organizationId);
    return NextResponse.json({
      organizationId: session.organizationId,
      source: "quickbooks" as const,
      syncedAt: syncedAt?.toISOString() ?? null,
      customers,
    });
  }

  const farmers = await loadInspectionCustomers(session);
  return NextResponse.json({
    organizationId: session.organizationId,
    source: "static" as const,
    syncedAt: null,
    customers: farmers.map((farmer) => ({
      key: farmer.id,
      label: farmer.label,
      farmerId: farmer.id,
      pivots: farmer.pivots,
    })),
  });
}
