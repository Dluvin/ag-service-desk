import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchCatalogLabor } from "@/lib/catalog";
import { ROLES } from "@/lib/roles";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (session.role === ROLES.FARMER) {
    return NextResponse.json({ total: 0, items: [] });
  }

  const q = new URL(request.url).searchParams.get("q") ?? "";
  const [total, items] = await Promise.all([
    prisma.catalogLabor.count({ where: { organizationId: session.organizationId, active: true } }),
    q.trim()
      ? searchCatalogLabor({
          organizationId: session.organizationId,
          query: q,
          take: 40,
          activeOnly: true,
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    total,
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      rate: item.rate,
    })),
  });
}
