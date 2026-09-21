import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { getRevealMapSnapshot } from "@/lib/fleet";
import { parseStoreParam } from "@/lib/stores";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (session.role === ROLES.FARMER) {
    return NextResponse.json({ configured: false, pins: [], error: null });
  }

  const stores = await prisma.store.findMany({
    where: { organizationId: session.organizationId },
    select: { id: true, name: true },
  });
  const selectedStore = parseStoreParam(new URL(request.url).searchParams.get("store") ?? undefined, stores);
  const snapshot = await getRevealMapSnapshot(session.organizationId, selectedStore);
  return NextResponse.json(snapshot);
}
