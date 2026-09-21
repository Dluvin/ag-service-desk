"use client";

import { useRouter } from "next/navigation";
import { STATUS_LABELS, TICKET_STATUSES, type TicketStatus } from "@/lib/roles";
import { ticketListHref, type TicketListDir, type TicketListQuery, type TicketListSort } from "@/lib/ticket-list";

const SORT_OPTIONS: { sort: TicketListSort; dir: TicketListDir; label: string }[] = [
  { sort: "status", dir: "asc", label: "Status" },
  { sort: "opened", dir: "desc", label: "Opened — newest first" },
  { sort: "opened", dir: "asc", label: "Opened — oldest first" },
  { sort: "scheduled", dir: "desc", label: "Scheduled — newest first" },
  { sort: "scheduled", dir: "asc", label: "Scheduled — oldest first" },
];

export function TicketListControls({ status, sort, dir }: TicketListQuery) {
  const router = useRouter();
  const sortValue = `${sort}:${dir}`;

  function go(next: TicketListQuery) {
    router.replace(ticketListHref(next));
  }

  return (
    <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-white p-4">
      <label className="text-sm font-medium">
        Status
        <select
          value={status}
          onChange={(event) => go({ status: parseStatus(event.target.value), sort, dir })}
          className="mt-1 block rounded-lg border border-stone-300 px-3 py-2"
        >
          <option value="all">All statuses</option>
          {TICKET_STATUSES.map((value) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium">
        Sort
        <select
          value={SORT_OPTIONS.some((option) => `${option.sort}:${option.dir}` === sortValue) ? sortValue : "status:asc"}
          onChange={(event) => {
            const [nextSort, nextDir] = event.target.value.split(":") as [TicketListSort, TicketListDir];
            go({ status, sort: nextSort, dir: nextDir });
          }}
          className="mt-1 block rounded-lg border border-stone-300 px-3 py-2"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={`${option.sort}:${option.dir}`} value={`${option.sort}:${option.dir}`}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function parseStatus(value: string): TicketListQuery["status"] {
  return TICKET_STATUSES.includes(value as TicketStatus) ? (value as TicketStatus) : "all";
}
