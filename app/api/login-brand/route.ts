import { NextResponse } from "next/server";
import { resolveOrgBrandByEmail } from "@/lib/org-brand";

export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get("email") ?? "";
  const brand = await resolveOrgBrandByEmail(email);
  return NextResponse.json(brand ?? {}, { headers: { "Cache-Control": "private, no-store" } });
}
