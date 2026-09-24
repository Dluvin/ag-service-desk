"use client";

import { useRouter } from "next/navigation";
import { dispatchHref, type DispatchListQuery } from "@/lib/dispatch-list";
import { TICKET_STATUSES, isFinishedStatus, type TicketStatus } from "@/lib/roles";
import { useLocale, useT } from "@/components/I18nProvider";
import { statusLabel } from "@/lib/i18n";

export function DispatchStatusFilters({
  statuses,
  hideCompleted,
  store,
  month,
  counts,
}: DispatchListQuery & {
  store: string;
  month?: string;
  counts: Partial<Record<TicketStatus, number>>;
}) {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();

  function go(next: DispatchListQuery) {
    router.replace(dispatchHref({ store, month, statuses: next.statuses, hideCompleted: next.hideCompleted }));
  }

  function toggleStatus(status: TicketStatus) {
    const adding = !statuses.includes(status);
    const selected = new Set(statuses);
    if (adding) selected.add(status);
    else selected.delete(status);
    go({
      statuses: TICKET_STATUSES.filter((value) => selected.has(value)),
      hideCompleted: adding && isFinishedStatus(status) ? false : hideCompleted,
    });
  }

  return (
    <div className="mt-4 rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium">{t("dispatch.status")}</p>
        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={hideCompleted}
            onChange={(event) =>
              go({
                statuses: event.target.checked ? statuses.filter((status) => !isFinishedStatus(status)) : statuses,
                hideCompleted: event.target.checked,
              })
            }
            className="size-4 rounded border-stone-300 text-emerald-800"
          />
          {t("dispatch.hideCompleted")}
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => go({ statuses: [], hideCompleted })}
          className={chipClass(statuses.length === 0)}
        >
          {t("common.all")}
        </button>
        {TICKET_STATUSES.map((status) => {
          const active = statuses.includes(status);
          const muted = hideCompleted && isFinishedStatus(status) && !active;
          return (
            <button
              key={status}
              type="button"
              onClick={() => toggleStatus(status)}
              className={chipClass(active, muted)}
            >
              {statusLabel(locale, status)}
              <span className={active ? "text-emerald-100" : "text-stone-500"}>
                {counts[status] ?? 0}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function chipClass(active: boolean, muted = false) {
  if (active) {
    return "inline-flex items-center gap-1.5 rounded-full bg-emerald-800 px-3 py-1 text-sm font-semibold text-white";
  }
  return `inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${
    muted
      ? "border-stone-200 bg-stone-50 text-stone-400 hover:border-stone-300"
      : "border-stone-300 bg-white text-stone-700 hover:border-emerald-700"
  }`;
}
