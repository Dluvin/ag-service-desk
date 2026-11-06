import type { CustomerListOption } from "./qb-customers";

export type CachedCustomerList = {
  organizationId: string;
  source: "static" | "quickbooks";
  syncedAt: string | null;
  savedAt: number;
  customers: CustomerListOption[];
};

const PREFIX = "ag-customer-list:";

export function customerListCacheKey(organizationId: string) {
  return `${PREFIX}${organizationId}`;
}

export function readCustomerListCache(organizationId: string): CachedCustomerList | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(customerListCacheKey(organizationId));
    if (!raw) return null;
    const value = JSON.parse(raw) as CachedCustomerList;
    if (!value || value.organizationId !== organizationId || !Array.isArray(value.customers)) return null;
    return value;
  } catch {
    return null;
  }
}

export function writeCustomerListCache(payload: CachedCustomerList) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(customerListCacheKey(payload.organizationId), JSON.stringify(payload));
  } catch {
    // Quota or private mode — ignore; online list still works.
  }
}
