import { prisma } from "./prisma";

export const CATALOG_PAGE_SIZE = 50;

function searchTokens(query: string) {
  return query
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/[%_]/g, "").trim())
    .filter((token) => token.length > 0)
    .slice(0, 6);
}

function catalogWhere(organizationId: string, query: string, activeOnly?: boolean) {
  const tokens = searchTokens(query);
  return {
    organizationId,
    ...(activeOnly ? { active: true } : {}),
    ...(tokens.length
      ? {
          AND: tokens.map((token) => ({
            OR: [
              { name: { contains: token } },
              { sku: { contains: token } },
              { description: { contains: token } },
            ],
          })),
        }
      : {}),
  };
}

export function parseCatalogPage(value: string | undefined) {
  const page = Number(value);
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.floor(page);
}

export async function searchCatalogParts(options: {
  organizationId: string;
  query: string;
  take: number;
  skip?: number;
  activeOnly?: boolean;
}) {
  return prisma.catalogPart.findMany({
    where: catalogWhere(options.organizationId, options.query, options.activeOnly),
    orderBy: { name: "asc" },
    take: options.take,
    skip: options.skip ?? 0,
  });
}

export async function countCatalogParts(options: {
  organizationId: string;
  query: string;
  activeOnly?: boolean;
}) {
  return prisma.catalogPart.count({
    where: catalogWhere(options.organizationId, options.query, options.activeOnly),
  });
}

export async function searchCatalogLabor(options: {
  organizationId: string;
  query: string;
  take: number;
  skip?: number;
  activeOnly?: boolean;
}) {
  return prisma.catalogLabor.findMany({
    where: catalogWhere(options.organizationId, options.query, options.activeOnly),
    orderBy: { name: "asc" },
    take: options.take,
    skip: options.skip ?? 0,
  });
}

export async function countCatalogLabor(options: {
  organizationId: string;
  query: string;
  activeOnly?: boolean;
}) {
  return prisma.catalogLabor.count({
    where: catalogWhere(options.organizationId, options.query, options.activeOnly),
  });
}

export async function searchCatalogEquipment(options: {
  organizationId: string;
  query: string;
  take: number;
  skip?: number;
  activeOnly?: boolean;
}) {
  return prisma.catalogEquipment.findMany({
    where: catalogWhere(options.organizationId, options.query, options.activeOnly),
    orderBy: { name: "asc" },
    take: options.take,
    skip: options.skip ?? 0,
  });
}

export async function countCatalogEquipment(options: {
  organizationId: string;
  query: string;
  activeOnly?: boolean;
}) {
  return prisma.catalogEquipment.count({
    where: catalogWhere(options.organizationId, options.query, options.activeOnly),
  });
}
