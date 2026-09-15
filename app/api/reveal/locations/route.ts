import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { getRevealMapSnapshot } from "@/lib/fleet";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (session.role === ROLES.FARMER) {
    return NextResponse.json({ configured: false, pins: [], error: null });
  }

  const snapshot = await getRevealMapSnapshot(session.organizationId);
  return NextResponse.json(snapshot);
}
