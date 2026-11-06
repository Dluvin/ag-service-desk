"use client";

import { useEffect, useMemo, useState } from "react";
import { CustomerPicker } from "@/components/CustomerPicker";
import { readCustomerListCache, writeCustomerListCache } from "@/lib/customer-list-cache";
import type { InspectionCustomerOption } from "@/lib/inspections";
import { customerNamesMatch, type CustomerListOption } from "@/lib/qb-customers";

const fieldClass = "h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base text-stone-900";

type PivotOption = {
  id: string;
  name: string;
  serialNumber: string | null;
  farmerId: string;
  farmerName: string;
  packageItem: string | null;
  packageDescription: string | null;
  packageBrand: string | null;
  packageTowerCount: number | null;
};

export function InspectionCustomerFields({
  organizationId,
  customerSource,
  staticCustomers,
  farmerId,
  qbListId,
  deskPivotId,
  onFarmer,
  onQbCustomer,
  onPivot,
}: {
  organizationId: string;
  customerSource: "static" | "quickbooks";
  staticCustomers: InspectionCustomerOption[];
  farmerId: string;
  qbListId: string;
  deskPivotId: string;
  onFarmer: (farmerId: string) => void;
  onQbCustomer: (listId: string) => void;
  onPivot: (pivot: PivotOption | null) => void;
}) {
  const staticOptions = useMemo<CustomerListOption[]>(
    () =>
      staticCustomers.map((customer) => ({
        key: customer.id,
        label: customer.label,
        farmerId: customer.id,
        pivots: customer.pivots,
      })),
    [staticCustomers],
  );
  const allPivots = useMemo<PivotOption[]>(
    () =>
      staticCustomers.flatMap((customer) =>
        customer.pivots.map((pivot) => ({
          ...pivot,
          farmerId: customer.id,
          farmerName: customer.label,
        })),
      ),
    [staticCustomers],
  );

  const [options, setOptions] = useState<CustomerListOption[]>(
    customerSource === "quickbooks" ? [] : staticOptions,
  );
  const [source, setSource] = useState(customerSource);
  const [statusNote, setStatusNote] = useState("");
  const [syncedAt, setSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    if (customerSource === "static") {
      setOptions(staticOptions);
      setSource("static");
      writeCustomerListCache({
        organizationId,
        source: "static",
        syncedAt: null,
        savedAt: Date.now(),
        customers: staticOptions,
      });
    }
  }, [customerSource, organizationId, staticOptions]);

  useEffect(() => {
    let cancelled = false;
    const cached = readCustomerListCache(organizationId);
    if (cached && cached.source === customerSource && cached.customers.length) {
      setOptions(cached.customers);
      setSource(cached.source);
      setSyncedAt(cached.syncedAt);
      setStatusNote(`Cached · ${new Date(cached.savedAt).toLocaleString()}`);
    }

    void fetch("/api/customers/list")
      .then(async (response) => {
        if (!response.ok) throw new Error("offline");
        return response.json() as Promise<{
          organizationId: string;
          source: "static" | "quickbooks";
          syncedAt: string | null;
          customers: CustomerListOption[];
        }>;
      })
      .then((data) => {
        if (cancelled) return;
        setOptions(data.customers);
        setSource(data.source);
        setSyncedAt(data.syncedAt);
        setStatusNote(
          data.source === "quickbooks"
            ? data.syncedAt
              ? `QuickBooks · synced ${new Date(data.syncedAt).toLocaleString()}`
              : "QuickBooks · not synced yet — run Web Connector from Connectors"
            : "Ag Desk customers",
        );
        writeCustomerListCache({
          organizationId: data.organizationId,
          source: data.source,
          syncedAt: data.syncedAt,
          savedAt: Date.now(),
          customers: data.customers,
        });
      })
      .catch(() => {
        if (cancelled) return;
        if (cached && cached.customers.length) {
          setOptions(cached.customers);
          setSource(cached.source);
          setSyncedAt(cached.syncedAt);
          setStatusNote(`Offline · using list cached ${new Date(cached.savedAt).toLocaleString()}`);
        } else if (customerSource === "static") {
          setStatusNote("Offline · using Ag Desk customers already on this device");
        } else {
          setStatusNote("Offline · no cached QuickBooks list on this device yet");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, customerSource]);

  const selectedKey = source === "quickbooks" ? qbListId : farmerId;
  const selectedOption = options.find((row) => row.key === selectedKey) ?? null;
  const matchedFarmerId =
    source === "quickbooks"
      ? selectedOption?.farmerId ||
        staticCustomers.find((customer) =>
          selectedOption ? customerNamesMatch(customer.label, selectedOption.label) : false,
        )?.id ||
        ""
      : farmerId;
  const pivotsForCustomer = matchedFarmerId
    ? allPivots.filter((pivot) => pivot.farmerId === matchedFarmerId)
    : [];

  return (
    <div className="grid gap-4">
      {statusNote ? <p className="text-sm text-stone-500">{statusNote}</p> : null}
      {source === "quickbooks" && !options.length ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          No QuickBooks customers on file yet
          {syncedAt ? "" : ". Open Connectors, queue a customer sync, then run Update Selected in Web Connector"}.
        </p>
      ) : null}
      <CustomerPicker
        customers={options}
        value={selectedKey}
        onChange={(key) => {
          const option = options.find((row) => row.key === key) ?? null;
          if (source === "quickbooks") {
            onQbCustomer(key);
            onFarmer(option?.farmerId ?? "");
          } else {
            onFarmer(key);
            onQbCustomer("");
          }
          onPivot(null);
        }}
        placeholder={source === "quickbooks" ? "Search QuickBooks customers" : "Search Ag Desk customers"}
      />
      {(source === "static" ? farmerId : qbListId) ? (
        <div className="grid gap-2">
          {source === "quickbooks" && !matchedFarmerId ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              No matching Ag Desk customer yet, so no pivots/assets are shown. Assets stay with their Ag Desk
              customer — link the QuickBooks name on the farm, or pick the matching customer after names align.
            </p>
          ) : null}
          <label className="grid gap-1 text-sm text-stone-700">
            Pivot (optional)
            <select
              value={deskPivotId}
              onChange={(event) => {
                const pivot = pivotsForCustomer.find((row) => row.id === event.target.value) ?? null;
                if (pivot) onFarmer(pivot.farmerId);
                onPivot(pivot);
              }}
              className={fieldClass}
              disabled={!matchedFarmerId}
            >
              <option value="">No linked pivot yet</option>
              {pivotsForCustomer.map((pivot) => (
                <option key={pivot.id} value={pivot.id}>
                  {pivot.name}
                  {pivot.serialNumber ? ` · ${pivot.serialNumber}` : ""}
                  {pivot.packageItem ? ` · pkg ${pivot.packageItem}` : ""}
                </option>
              ))}
            </select>
          </label>
          {matchedFarmerId ? (
            <p className="text-xs text-stone-500">
              Showing only pivots/assets for this customer. Changing customer lists never moves assets.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
