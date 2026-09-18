import Link from "next/link";
import { calendarDays, dayKey, formatSchedule, monthKey, parseMonthParam, shiftMonth } from "@/lib/schedule";
import { STORE_ALL } from "@/lib/stores";

type CalTicket = {
  id: string;
  number: number;
  title: string;
  scheduledAt: Date | string | null;
  technician: { name: string } | null;
  farmer: { name: string };
};

export function DispatchCalendar({
  tickets,
  month,
  store,
}: {
  tickets: CalTicket[];
  month?: string;
  store: string;
}) {
  const monthStart = parseMonthParam(month);
  const days = calendarDays(monthStart);
  const today = dayKey(new Date());
  const byDay = new Map<string, CalTicket[]>();
  for (const ticket of tickets) {
    if (!ticket.scheduledAt) continue;
    const key = dayKey(new Date(ticket.scheduledAt));
    const list = byDay.get(key) ?? [];
    list.push(ticket);
    byDay.set(key, list);
  }

  function hrefFor(nextMonth: Date) {
    const params = new URLSearchParams();
    if (store && store !== STORE_ALL) params.set("store", store);
    params.set("month", monthKey(nextMonth));
    return `/dispatch?${params.toString()}`;
  }

  const label = monthStart.toLocaleString(undefined, { month: "long", year: "numeric" });

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl">Schedule</h2>
          <p className="mt-1 text-sm text-stone-600">Tickets with a scheduled time land on this calendar.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={hrefFor(shiftMonth(monthStart, -1))} className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm">
            Previous
          </Link>
          <p className="min-w-40 text-center text-sm font-semibold">{label}</p>
          <Link href={hrefFor(shiftMonth(monthStart, 1))} className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm">
            Next
          </Link>
        </div>
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="grid grid-cols-7 bg-stone-50 text-center text-xs font-semibold uppercase tracking-wide text-stone-500">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="px-1 py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 border-t border-stone-200">
          {days.map((date) => {
            const key = dayKey(date);
            const inMonth = date.getMonth() === monthStart.getMonth();
            const items = byDay.get(key) ?? [];
            return (
              <div
                key={key}
                className={`min-h-28 border-b border-r border-stone-100 p-1.5 last:border-r-0 ${inMonth ? "bg-white" : "bg-stone-50 text-stone-400"} ${key === today ? "ring-1 ring-inset ring-emerald-700" : ""}`}
              >
                <p className="text-xs font-semibold">{date.getDate()}</p>
                <ul className="mt-1 space-y-1">
                  {items.map((ticket) => (
                    <li key={ticket.id}>
                      <Link
                        href={`/tickets/${ticket.id}`}
                        className="block rounded bg-emerald-50 px-1 py-0.5 text-[11px] leading-snug text-emerald-950 hover:bg-emerald-100"
                      >
                        <span className="font-semibold">#{ticket.number}</span> {formatSchedule(ticket.scheduledAt)?.split("·")[1]?.trim() ?? ""}
                        <span className="block truncate">{ticket.farmer.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
