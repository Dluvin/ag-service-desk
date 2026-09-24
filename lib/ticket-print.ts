import type { Prisma } from "@prisma/client";
import { PRINTABLE_STATUSES, type TicketStatus } from "@/lib/roles";
import { STORE_ALL } from "@/lib/stores";

export const closedTicketPrintInclude = {
  organization: true,
  farmer: { include: { contacts: { orderBy: { name: "asc" as const } } } },
  pivot: true,
  asset: { include: { assetType: true } },
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

export function parsePrintableStatusParam(value: string | string[] | undefined): TicketStatus | undefined {
  const raw = (Array.isArray(value) ? value[0] : value)?.trim().toUpperCase();
  if (raw && PRINTABLE_STATUSES.includes(raw as TicketStatus)) return raw as TicketStatus;
  return undefined;
}

export function firstQueryValue(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() || undefined;
}

export function printSelectHref(opts?: { status?: TicketStatus; store?: string }) {
  const params = new URLSearchParams();
  if (opts?.status) params.set("status", opts.status);
  if (opts?.store && opts.store !== STORE_ALL) params.set("store", opts.store);
  const query = params.toString();
  return query ? `/tickets/print?${query}` : "/tickets/print";
}

export function printBatchHref(ids: string[], opts?: { status?: TicketStatus; store?: string }) {
  const params = new URLSearchParams();
  params.set("ids", ids.join(","));
  if (opts?.status) params.set("status", opts.status);
  if (opts?.store && opts.store !== STORE_ALL) params.set("store", opts.store);
  return `/tickets/print/batch?${params.toString()}`;
}
