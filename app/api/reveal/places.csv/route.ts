import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { listRevealPlaces, parsePlaceCategoryInput, revealPlacesToCsv } from "@/lib/reveal";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!isAdmin(session.role)) {
    return NextResponse.json({ error: "Only company admins can export Reveal places." }, { status: 403 });
  }

  try {
    const raw = new URL(request.url).searchParams.get("category")?.trim() ?? "";
    const { named, wantsAll } = parsePlaceCategoryInput(raw);
    const places = await listRevealPlaces(session.organizationId, named, wantsAll);
    const csv = revealPlacesToCsv(places);
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="reveal-places-${stamp}.csv"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not export Reveal places.";
    return new NextResponse(message, { status: 502, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}
