"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ListSearch } from "@/components/ListSearch";
import { MAX_BATCH_PRINT, printBatchHref } from "@/lib/ticket-print";
import { queueQbEstimatesAction } from "@/lib/qbwc-actions";
import type { TicketStatus } from "@/lib/roles";

type ClosedRow = {
  id: string;
  number: number;
  title: string;
  farmerName: string;
  qbCustomerName?: string;
  status: string;
  statusLabel: string;
  invoiceNumber: string | null;
  datedAt: string | null;
};

export function ClosedTicketPrintSelect({
  tickets,
  status,
  store,
  canSendQuickBooks = false,
}: {
  tickets: ClosedRow[];
  status?: TicketStatus | "ALL";
  store?: string;
  canSendQuickBooks?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter((ticket) => {
      const hay = `#${ticket.number} ${ticket.title} ${ticket.farmerName} ${ticket.qbCustomerName ?? ""} ${ticket.statusLabel} ${ticket.invoiceNumber ?? ""}`.toLowerCase();
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

  async function sendSelected() {
    const ids = tickets.map((ticket) => ticket.id).filter((id) => selected.has(id));
    if (ids.length === 0) return;
    setPending(true);
    setNotice(null);
    setSendError(null);
    const result = await queueQbEstimatesAction(ids.slice(0, MAX_BATCH_PRINT));
    setPending(false);
    if (result?.error) setSendError(result.error);
    else setNotice(result?.success ?? "Queued.");
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
          {canSendQuickBooks ? (
            <button
              type="button"
              disabled={selected.size === 0 || pending}
              onClick={sendSelected}
              className="rounded-lg border border-emerald-800 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 disabled:opacity-50"
            >
              {pending ? "Queuing…" : `Send selected to QuickBooks (${selected.size})`}
            </button>
          ) : null}
        </div>
      </div>
      {notice ? <p className="mt-3 text-sm text-emerald-800">{notice}</p> : null}
      {sendError ? <p className="mt-3 text-sm text-red-700">{sendError}</p> : null}
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
                    {ticket.qbCustomerName && ticket.qbCustomerName !== ticket.farmerName
                      ? `${ticket.farmerName} · QuickBooks ${ticket.qbCustomerName}`
                      : ticket.farmerName}
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
