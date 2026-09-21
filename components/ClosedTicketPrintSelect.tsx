"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ListSearch } from "@/components/ListSearch";
import { MAX_BATCH_PRINT, printBatchHref } from "@/lib/ticket-print";
import type { TicketStatus } from "@/lib/roles";

type ClosedRow = {
  id: string;
  number: number;
  title: string;
  farmerName: string;
  status: string;
  statusLabel: string;
  invoiceNumber: string | null;
  datedAt: string | null;
};

export function ClosedTicketPrintSelect({
  tickets,
  status,
  store,
}: {
  tickets: ClosedRow[];
  status?: TicketStatus;
  store?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter((ticket) => {
      const hay = `#${ticket.number} ${ticket.title} ${ticket.farmerName} ${ticket.statusLabel} ${ticket.invoiceNumber ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, tickets]);

  const allShownSelected = shown.length > 0 && shown.every((ticket) => selected.has(ticket.id));

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleShown() {
    setSelected((current) => {
      const next = new Set(current);
      if (allShownSelected) {
        for (const ticket of shown) next.delete(ticket.id);
      } else {
        for (const ticket of shown) next.add(ticket.id);
      }
      return next;
    });
  }

  function printIds(ids: string[]) {
    if (ids.length === 0) return;
    router.push(printBatchHref(ids.slice(0, MAX_BATCH_PRINT), { status, store }));
  }

  function printSelected() {
    printIds(tickets.map((ticket) => ticket.id).filter((id) => selected.has(id)));
  }

  function printAll() {
    printIds(tickets.map((ticket) => ticket.id));
  }

  return (
    <div>
      <ListSearch value={query} onChange={setQuery} label="Search work orders" placeholder="Work order #, customer, invoice" />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={allShownSelected} onChange={toggleShown} />
          Select all shown ({shown.length})
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={printAll}
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold"
          >
            Print all ({tickets.length})
          </button>
          <button
            type="button"
            disabled={selected.size === 0}
            onClick={printSelected}
            className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Print selected ({selected.size})
          </button>
        </div>
      </div>
      <ul className="mt-4 divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200 bg-white">
        {shown.length === 0 ? (
          <li className="px-4 py-6 text-sm text-stone-600">No work orders match that search.</li>
        ) : (
          shown.map((ticket) => (
            <li key={ticket.id}>
              <label className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-stone-50">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selected.has(ticket.id)}
                  onChange={() => toggle(ticket.id)}
                />
                <span>
                  <span className="font-medium">
                    #{ticket.number} {ticket.title}
                  </span>
                  <span className="mt-0.5 block text-sm text-stone-600">
                    {ticket.farmerName}
                    {` · ${ticket.statusLabel}`}
                    {ticket.invoiceNumber ? ` · Invoice ${ticket.invoiceNumber}` : ""}
                    {ticket.datedAt
                      ? ` · ${ticket.status === "COMPLETED" ? "Closed" : ticket.status === "REPAIR_DONE" ? "Repair done" : "Updated"} ${new Date(ticket.datedAt).toLocaleDateString()}`
                      : ""}
                  </span>
                </span>
              </label>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
