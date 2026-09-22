import type { Prisma } from "@prisma/client";

export const STORE_ALL = "all";
export const STORE_NONE = "none";

export type StoreOption = { id: string; name: string };

export function parseStoreParam(value: string | undefined, stores: StoreOption[]) {
  const selected = (value ?? STORE_ALL).trim() || STORE_ALL;
  if (selected === STORE_ALL || selected === STORE_NONE) return selected;
  return stores.some((store) => store.id === selected) ? selected : STORE_ALL;
}

export function storeFarmerWhere(selected: string): Prisma.FarmerWhereInput {
  if (selected === STORE_ALL) return {};
  if (selected === STORE_NONE) return { storeId: null };
  return { storeId: selected };
}

export function storeFarmWhere(selected: string): Prisma.FarmWhereInput {
  return { farmer: storeFarmerWhere(selected) };
}

export function storeTicketWhere(selected: string): Prisma.TicketWhereInput {
  if (selected === STORE_ALL) return {};
  if (selected === STORE_NONE) {
    return { storeId: null, farmer: { storeId: null } };
  }
  return {
    OR: [{ storeId: selected }, { storeId: null, farmer: { storeId: selected } }],
  };
}

export function ticketStoreName(ticket: {
  store?: { name: string } | null;
  farmer?: { store?: { name: string } | null } | null;
}) {
  return ticket.store?.name ?? ticket.farmer?.store?.name ?? null;
}

export function storePivotWhere(selected: string): Prisma.PivotWhereInput {
  if (selected === STORE_ALL) return {};
  if (selected === STORE_NONE) return { farmer: { storeId: null } };
  return { farmer: { storeId: selected } };
}

export function storeAssetWhere(selected: string): Prisma.AssetWhereInput {
  if (selected === STORE_ALL) return {};
  if (selected === STORE_NONE) return { farmer: { storeId: null } };
  return { farmer: { storeId: selected } };
}

export function vehicleEffectiveStoreId(
  vehicleStoreId: string | null | undefined,
  staffStoreId: string | null | undefined,
) {
  return vehicleStoreId ?? staffStoreId ?? null;
}

export function matchesSelectedStore(effectiveStoreId: string | null, selected: string) {
  if (selected === STORE_ALL) return true;
  if (selected === STORE_NONE) return effectiveStoreId == null;
  return effectiveStoreId === selected;
}

export function resolvedTicketStoreId(ticket: {
  storeId?: string | null;
  farmer?: { storeId?: string | null } | null;
}) {
  return ticket.storeId ?? ticket.farmer?.storeId ?? null;
}

export function storeQuery(selected: string) {
  return selected === STORE_ALL ? "" : `?store=${encodeURIComponent(selected)}`;
}
