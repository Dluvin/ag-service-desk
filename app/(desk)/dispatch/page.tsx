import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadTechnicians, ticketWhere } from "@/lib/scope";
import {
  DISPATCH_STATUSES,
  ROLES,
  TICKET_STATUSES,
  canAssignTickets,
  type TicketStatus,
} from "@/lib/roles";
import { DispatchFleetMap } from "@/components/DispatchFleetMap";
import { ticketPins } from "@/lib/map-pins";
import { parseStoreParam, storeTicketWhere, ticketStoreName } from "@/lib/stores";
import { ticketSiteName } from "@/lib/ticket-site";
import { StoreFilter } from "@/components/StoreFilter";
import { DispatchCalendarToggle } from "@/components/DispatchCalendarToggle";
import { DispatchWorkOrderCard } from "@/components/DispatchWorkOrderCard";
import { DispatchStatusFilters } from "@/components/DispatchStatusFilters";
import { DispatchAssignForm } from "@/components/DispatchAssignForm";
import { DispatchTilesBoard } from "@/components/DispatchTilesBoard";
import { dispatchFilterExtra, filterDispatchTickets, parseDispatchListQuery } from "@/lib/dispatch-list";
import { loadUserDispatchView } from "@/lib/dispatch-view";
import { formatSchedule } from "@/lib/schedule";
import { getRequestLocale } from "@/lib/user-locale";
import { statusLabel, t } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

export default async function DispatchPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string; month?: string; status?: string | string[]; closed?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === ROLES.FARMER) redirect("/dashboard");

  const query = await searchParams;
  const [stores, dispatchView, locale] = await Promise.all([
    prisma.store.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    loadUserDispatchView(session.userId),
    getRequestLocale(),
  ]);
  const selectedStore = parseStoreParam(query.store, stores);
  const filters = parseDispatchListQuery(query);
  const tiles = dispatchView === "TILES";

  const [tickets, technicians] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        ...ticketWhere(session),
        ...storeTicketWhere(selectedStore),
      },
      include: { farmer: { include: { store: true } }, pivot: true, asset: { include: { assetType: true } }, technician: true, store: true },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    }),
    loadTechnicians(session.organizationId),
  ]);

  const listTickets = filterDispatchTickets(tickets, filters);
  const openTickets = tickets.filter((ticket) => DISPATCH_STATUSES.includes(ticket.status as TicketStatus));
  const statusCounts = Object.fromEntries(
    TICKET_STATUSES.map((status) => [status, tickets.filter((ticket) => ticket.status === status).length]),
  ) as Partial<Record<TicketStatus, number>>;
  const canAssign = canAssignTickets(session.role);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">{t(locale, "dispatch.title")}</h1>
        <Link href="/tickets/new" className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
          {t(locale, "dispatch.create")}
        </Link>
      </div>
      <p className="mt-1 text-stone-600">
        {tiles ? t(locale, "dispatch.tilesHelp") : t(locale, "dispatch.listHelp")}
      </p>
      <StoreFilter
        stores={stores}
        selected={selectedStore}
        pathname="/dispatch"
        extra={tiles ? { month: query.month } : dispatchFilterExtra({ ...filters, month: query.month })}
        allLabel={t(locale, "common.allStores")}
        noneLabel={t(locale, "common.noStore")}
      />
      {tiles ? (
        <DispatchTilesBoard tickets={openTickets} technicians={technicians} canAssign={canAssign} locale={locale} />
      ) : (
        <>
          <DispatchStatusFilters
            statuses={filters.statuses}
            hideCompleted={filters.hideCompleted}
            store={selectedStore}
            month={query.month}
            counts={statusCounts}
          />
          <p className="mt-3 text-sm text-stone-500">{summaryText(locale, listTickets.length, filters.statuses, filters.hideCompleted)}</p>
          <ul className="mt-4 space-y-2">
            {listTickets.length === 0 ? (
              <li className="rounded-xl border border-stone-200 bg-white px-4 py-6 text-stone-600">
                {emptyText(locale, filters.statuses, filters.hideCompleted)}
              </li>
            ) : (
              listTickets.map((ticket) => (
                <DispatchWorkOrderCard
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
                  number={ticket.number}
                  title={ticket.title}
                  customer={ticket.farmer.name}
                  priority={ticket.priority}
                  status={ticket.status}
                >
                  <p className="mt-1 text-xs text-stone-600">
                    {[ticketStoreName(ticket), ticketSiteName(ticket)].filter(Boolean).join(" · ") || t(locale, "dispatch.noStorePivot")}
                  </p>
                  {ticket.scheduledAt ? (
                    <p className="mt-1 text-xs font-medium text-emerald-900">{formatSchedule(ticket.scheduledAt)}</p>
                  ) : null}
                  <DispatchAssignForm
                    ticketId={ticket.id}
                    technicianId={ticket.technicianId}
                    status={ticket.status}
                    canAssign={canAssign}
                    technicians={technicians}
                    locale={locale}
                  />
                </DispatchWorkOrderCard>
              ))
            )}
          </ul>
        </>
      )}

      <DispatchCalendarToggle tickets={openTickets} month={query.month} store={selectedStore} />

      <h2 className="font-display mt-10 text-xl">{t(locale, "dispatch.mapTitle")}</h2>
      <p className="mt-1 text-sm text-stone-600">{t(locale, "dispatch.mapHelp")}</p>
      <div className="mt-4">
        <DispatchFleetMap ticketPins={ticketPins(openTickets)} canConfigure={session.role === ROLES.ADMIN} store={selectedStore} />
      </div>
    </div>
  );
}

function summaryText(locale: Locale, count: number, statuses: TicketStatus[], hideCompleted: boolean) {
  const noun = count === 1 ? t(locale, "dispatch.oneWo") : t(locale, "dispatch.manyWo");
  if (count === 0) return emptyText(locale, statuses, hideCompleted);
  if (statuses.length === 1) {
    return t(locale, "dispatch.countStatus", { count, status: statusLabel(locale, statuses[0]), noun });
  }
  if (statuses.length > 1) return t(locale, "dispatch.countStatuses", { count, noun, n: statuses.length });
  if (hideCompleted) return t(locale, "dispatch.countOpen", { count, noun });
  return t(locale, "dispatch.countAll", { count, noun });
}

function emptyText(locale: Locale, statuses: TicketStatus[], hideCompleted: boolean) {
  if (statuses.length === 1) return t(locale, "dispatch.emptyStatus", { status: statusLabel(locale, statuses[0]) });
  if (statuses.length > 1) return t(locale, "dispatch.emptyStatuses");
  if (hideCompleted) return t(locale, "dispatch.emptyOpen");
  return t(locale, "dispatch.emptyAll");
}
