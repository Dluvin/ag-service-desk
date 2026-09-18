import type { Prisma } from "@prisma/client";

export const closedTicketPrintInclude = {
  organization: true,
  farmer: { include: { contacts: { orderBy: { name: "asc" as const } } } },
  pivot: true,
  technician: true,
  updates: { include: { user: true, photos: true }, orderBy: { createdAt: "asc" as const } },
  parts: { orderBy: { createdAt: "asc" as const } },
  labor: { orderBy: { createdAt: "asc" as const } },
  equipment: { orderBy: { createdAt: "asc" as const } },
  siteVisits: { orderBy: { startedAt: "asc" as const } },
} satisfies Prisma.TicketInclude;

export const MAX_BATCH_PRINT = 75;

export function parseTicketIdList(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value.join(",") : (value ?? "");
  const ids = raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return [...new Set(ids)].slice(0, MAX_BATCH_PRINT);
}
