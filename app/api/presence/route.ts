import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canViewStaffPresence, isShopStaff, ROLES } from "@/lib/roles";
import { listStaffPresence, recordStaffPresence } from "@/lib/presence";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!isShopStaff(session.role) || session.impersonatorId) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  let body: { path?: string; latitude?: number; longitude?: number } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  await recordStaffPresence({
    userId: session.userId,
    path: body.path,
    latitude: body.latitude,
    longitude: body.longitude,
  });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!canViewStaffPresence(session.role) || session.role !== ROLES.ADMIN) {
    return NextResponse.json({ error: "Company admins only." }, { status: 403 });
  }
  const people = await listStaffPresence(session.organizationId);
  return NextResponse.json({ people });
}
