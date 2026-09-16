import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

function likePattern(query: string) {
  return `%${query.trim().replace(/[%_]/g, "")}%`;
}

export async function searchCatalogParts(options: {
  organizationId: string;
  query: string;
  take: number;
  activeOnly?: boolean;
}) {
  const q = options.query.trim();
  if (!q) {
    return prisma.catalogPart.findMany({
      where: {
        organizationId: options.organizationId,
        ...(options.activeOnly ? { active: true } : {}),
      },
      orderBy: { name: "asc" },
      take: options.take,
    });
  }

  const pattern = likePattern(q);
  return prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      sku: string | null;
      description: string | null;
      itemType: string | null;
      price: number | null;
      cost: number | null;
      quantityOnHand: number | null;
      active: boolean;
    }>
  >`
    SELECT id, name, sku, description, itemType, price, cost, quantityOnHand, active
    FROM CatalogPart
    WHERE organizationId = ${options.organizationId}
      ${options.activeOnly ? Prisma.sql`AND active = 1` : Prisma.empty}
      AND (name LIKE ${pattern} COLLATE NOCASE OR IFNULL(sku, '') LIKE ${pattern} COLLATE NOCASE)
    ORDER BY name COLLATE NOCASE
    LIMIT ${options.take}
  `;
}
