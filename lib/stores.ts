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

export function storeTicketWhere(selected: string): Prisma.TicketWhereInput {
  if (selected === STORE_ALL) return {};
  if (selected === STORE_NONE) return { farmer: { storeId: null } };
  return { farmer: { storeId: selected } };
}

export function storePivotWhere(selected: string): Prisma.PivotWhereInput {
  if (selected === STORE_ALL) return {};
  if (selected === STORE_NONE) return { farmer: { storeId: null } };
  return { farmer: { storeId: selected } };
}

export function storeQuery(selected: string) {
  return selected === STORE_ALL ? "" : `?store=${encodeURIComponent(selected)}`;
}
