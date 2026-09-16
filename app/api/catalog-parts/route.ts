import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchCatalogParts } from "@/lib/catalog";
import { ROLES } from "@/lib/roles";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (session.role === ROLES.FARMER) {
    return NextResponse.json({ total: 0, parts: [] });
  }

  const q = new URL(request.url).searchParams.get("q") ?? "";
  const [total, parts] = await Promise.all([
    prisma.catalogPart.count({ where: { organizationId: session.organizationId, active: true } }),
    q.trim()
      ? searchCatalogParts({
          organizationId: session.organizationId,
          query: q,
          take: 40,
          activeOnly: true,
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    total,
    parts: parts.map((part) => ({
      id: part.id,
      name: part.name,
      sku: part.sku,
      price: part.price,
    })),
  });
}
