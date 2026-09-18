"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ListSearch } from "@/components/ListSearch";

type ClosedRow = {
  id: string;
  number: number;
  title: string;
  farmerName: string;
  invoiceNumber: string | null;
  closedAt: string | null;
};

export function ClosedTicketPrintSelect({ tickets }: { tickets: ClosedRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter((ticket) => {
      const hay = `#${ticket.number} ${ticket.title} ${ticket.farmerName} ${ticket.invoiceNumber ?? ""}`.toLowerCase();
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

  function printSelected() {
    const ids = tickets.map((ticket) => ticket.id).filter((id) => selected.has(id));
    if (ids.length === 0) return;
    router.push(`/tickets/print/batch?ids=${encodeURIComponent(ids.join(","))}`);
  }

  return (
    <div>
      <ListSearch value={query} onChange={setQuery} label="Search closed tickets" placeholder="Ticket #, farm, invoice" />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={allShownSelected} onChange={toggleShown} />
          Select all shown ({shown.length})
        </label>
        <button
          type="button"
          disabled={selected.size === 0}
          onClick={printSelected}
          className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Print selected ({selected.size})
        </button>
      </div>
      <ul className="mt-4 divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200 bg-white">
        {shown.length === 0 ? (
          <li className="px-4 py-6 text-sm text-stone-600">No closed tickets match that search.</li>
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
                    {ticket.invoiceNumber ? ` · Invoice ${ticket.invoiceNumber}` : ""}
                    {ticket.closedAt ? ` · Closed ${new Date(ticket.closedAt).toLocaleDateString()}` : ""}
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
