"use client";

import { useEffect, useState } from "react";
import { STORE_ALL } from "@/lib/stores";
import { DispatchCalendar } from "@/components/DispatchCalendar";
import { useT } from "@/components/I18nProvider";

const STORAGE_KEY = "ag-dispatch-show-calendar";

type CalTicket = {
  id: string;
  number: number;
  title: string;
  scheduledAt: Date | string | null;
  technician: { name: string } | null;
  farmer: { name: string };
};

export function DispatchCalendarToggle({
  tickets,
  month,
  store,
}: {
  tickets: CalTicket[];
  month?: string;
  store: string;
}) {
  const [open, setOpen] = useState(false);
  const t = useT();

  useEffect(() => {
    setOpen(sessionStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  function calendarHref() {
    const params = new URLSearchParams();
    if (store && store !== STORE_ALL) params.set("store", store);
    if (month) params.set("month", month);
    const query = params.toString();
    return query ? `/dispatch/calendar?${query}` : "/dispatch/calendar";
  }

  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl">{t("dispatch.schedule")}</h2>
          <p className="mt-1 text-sm text-stone-600">{t("dispatch.scheduleHelp")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const next = !open;
              setOpen(next);
              sessionStorage.setItem(STORAGE_KEY, next ? "1" : "0");
            }}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium"
          >
            {open ? t("dispatch.hideCalendar") : t("dispatch.showCalendar")}
          </button>
          <a
            href={calendarHref()}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-emerald-800 px-3 py-1.5 text-sm font-semibold text-white"
          >
            {t("dispatch.openCalendar")}
          </a>
        </div>
      </div>
      {open ? <DispatchCalendar tickets={tickets} month={month} store={store} compact /> : null}
    </div>
  );
}
