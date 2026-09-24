"use client";

import { useRouter } from "next/navigation";
import { TICKET_STATUSES, type TicketStatus } from "@/lib/roles";
import { ticketListHref, type TicketListDir, type TicketListQuery, type TicketListSort } from "@/lib/ticket-list";
import { useLocale, useT } from "@/components/I18nProvider";
import { statusLabel } from "@/lib/i18n";

export function TicketListControls({ status, sort, dir }: TicketListQuery) {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  const sortValue = `${sort}:${dir}`;
  const sortOptions: { sort: TicketListSort; dir: TicketListDir; label: string }[] = [
    { sort: "status", dir: "asc", label: t("tickets.sortStatus") },
    { sort: "opened", dir: "desc", label: t("tickets.sortOpenedDesc") },
    { sort: "opened", dir: "asc", label: t("tickets.sortOpenedAsc") },
    { sort: "scheduled", dir: "desc", label: t("tickets.sortSchedDesc") },
    { sort: "scheduled", dir: "asc", label: t("tickets.sortSchedAsc") },
  ];

  function go(next: TicketListQuery) {
    router.replace(ticketListHref(next));
  }

  return (
    <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-white p-4">
      <label className="text-sm font-medium">
        {t("tickets.colStatus")}
        <select
          value={status}
          onChange={(event) => go({ status: parseStatus(event.target.value), sort, dir })}
          className="mt-1 block rounded-lg border border-stone-300 px-3 py-2"
        >
          <option value="all">{t("tickets.allStatuses")}</option>
          {TICKET_STATUSES.map((value) => (
            <option key={value} value={value}>
              {statusLabel(locale, value)}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium">
        {t("tickets.sort")}
        <select
          value={sortOptions.some((option) => `${option.sort}:${option.dir}` === sortValue) ? sortValue : "status:asc"}
          onChange={(event) => {
            const [nextSort, nextDir] = event.target.value.split(":") as [TicketListSort, TicketListDir];
            go({ status, sort: nextSort, dir: nextDir });
          }}
          className="mt-1 block rounded-lg border border-stone-300 px-3 py-2"
        >
          {sortOptions.map((option) => (
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
