import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ticketWhere } from "@/lib/scope";
import { isPrintableStatus, requiresInvoice, ROLES, type TicketStatus } from "@/lib/roles";
import { StatusBadge, PriorityBadge } from "@/components/Badges";
import { TicketListControls } from "@/components/TicketListControls";
import { formatSchedule } from "@/lib/schedule";
import { formatMoney } from "@/lib/money";
import { ticketStoreName } from "@/lib/stores";
import {
  groupTicketsByStatus,
  parseTicketListQuery,
  sortTickets,
  ticketListHref,
  type TicketListQuery,
  type TicketListSort,
} from "@/lib/ticket-list";
import { getRequestLocale } from "@/lib/user-locale";
import { statusLabel, t, type Locale } from "@/lib/i18n";
import { ticketSiteName } from "@/lib/ticket-site";

type TicketRow = Prisma.TicketGetPayload<{
  include: { farmer: { include: { store: true } }; pivot: true; asset: { include: { assetType: true } }; technician: true; store: true };
}>;

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; sort?: string; dir?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const locale = await getRequestLocale();

  const query = parseTicketListQuery(await searchParams);
  const tickets = sortTickets(
    await prisma.ticket.findMany({
      where: {
        ...ticketWhere(session),
        ...(query.status === "all" ? {} : { status: query.status }),
      },
      include: { farmer: { include: { store: true } }, pivot: true, asset: { include: { assetType: true } }, technician: true, store: true },
      orderBy: { updatedAt: "desc" },
    }),
    query,
  );
  const showGroups = query.sort === "status" && query.status === "all" && tickets.length > 0;
  const groups = showGroups ? groupTicketsByStatus(tickets) : [{ status: query.status, tickets }];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">{t(locale, "tickets.title")}</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/tickets/print" className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold">
            {t(locale, "tickets.batchPrint")}
          </Link>
          <Link href="/tickets/new" className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
            {session.role === ROLES.FARMER ? t(locale, "tickets.request") : t(locale, "tickets.new")}
          </Link>
        </div>
      </div>
      <TicketListControls status={query.status} sort={query.sort} dir={query.dir} />
      <p className="mt-3 text-sm text-stone-500">{summaryText(locale, tickets.length, query)}</p>
      <div className="mt-4 overflow-hidden rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-200/80 text-xs font-semibold uppercase tracking-wide text-stone-800">
            <tr>
              <th className="px-4 py-2">{t(locale, "tickets.colWo")}</th>
              <th className="px-4 py-2">{t(locale, "tickets.colCustomer")}</th>
              <th className="px-4 py-2">{t(locale, "tickets.colTech")}</th>
              <th className="px-4 py-2">{t(locale, "tickets.colPriority")}</th>
              <SortableHeader label={t(locale, "tickets.colStatus")} column="status" query={query} />
              <SortableHeader label={t(locale, "tickets.colOpened")} column="opened" query={query} />
              <SortableHeader label={t(locale, "tickets.colScheduled")} column="scheduled" query={query} />
              <th className="px-4 py-2">{t(locale, "tickets.colInvoice")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-stone-600">
                  {query.status === "all"
                    ? t(locale, "tickets.emptyAll")
                    : t(locale, "tickets.emptyStatus", { status: statusLabel(locale, query.status) })}
                </td>
              </tr>
            ) : (
              groups.map((group) => (
                <TicketGroup
                  key={group.status}
                  status={group.status}
                  tickets={group.tickets}
                  showHeading={showGroups}
                  locale={locale}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortableHeader({
  label,
  column,
  query,
}: {
  label: string;
  column: TicketListSort;
  query: TicketListQuery;
}) {
  const active = query.sort === column;
  const nextDir = column === "status" ? "asc" : active && query.dir === "desc" ? "asc" : "desc";
  return (
    <th className="px-4 py-2" aria-sort={active ? (query.dir === "asc" ? "ascending" : "descending") : "none"}>
      <Link
        href={ticketListHref({ ...query, sort: column, dir: nextDir })}
        className={active ? "font-semibold text-emerald-800 hover:underline" : "font-semibold text-stone-800 hover:underline"}
      >
        {label}
        {active ? (query.dir === "asc" ? " ↑" : " ↓") : ""}
      </Link>
    </th>
  );
}

function TicketGroup({
  status,
  tickets,
  showHeading,
  locale,
}: {
  status: TicketStatus | "all";
  tickets: TicketRow[];
  showHeading: boolean;
  locale: Locale;
}) {
  return (
    <>
      {showHeading && status !== "all" ? (
        <tr className="bg-stone-200/80">
          <td colSpan={8} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-stone-800">
            {t(locale, "tickets.grouped", { status: statusLabel(locale, status), count: tickets.length })}
          </td>
        </tr>
      ) : null}
      {tickets.map((ticket) => (
        <tr key={ticket.id} className="hover:bg-stone-50">
          <td className="px-4 py-3">
            <Link href={`/tickets/${ticket.id}`} className="font-medium text-emerald-900 hover:underline">
              #{ticket.number} {ticket.title}
            </Link>
          </td>
          <td className="px-4 py-3 text-stone-600">
            {ticket.farmer.name}
            {ticketStoreName(ticket) ? ` · ${ticketStoreName(ticket)}` : ""}
            <br />
            {ticketSiteName(ticket)}
          </td>
            <td className="px-4 py-3">{ticket.technician?.name ?? t(locale, "common.unassigned")}</td>
          <td className="px-4 py-3">
            <PriorityBadge priority={ticket.priority} />
          </td>
          <td className="px-4 py-3">
            <StatusBadge status={ticket.status} />
          </td>
          <td className="px-4 py-3 text-stone-600">{formatSchedule(ticket.createdAt) ?? "—"}</td>
          <td className="px-4 py-3 text-stone-600">{formatSchedule(ticket.scheduledAt) ?? "—"}</td>
          <td className="px-4 py-3">
            {ticket.invoiceNumber ? (
              <span className="text-stone-700">
                {ticket.invoiceNumber}
                {ticket.invoiceAmount != null ? ` · ${formatMoney(ticket.invoiceAmount)}` : ""}
              </span>
            ) : requiresInvoice(ticket.status) ? (
              <span className="text-red-700">{t(locale, "tickets.invoiceMissing")}</span>
            ) : (
              "—"
            )}
            {isPrintableStatus(ticket.status) ? (
              <>
                <br />
                <Link href={`/tickets/${ticket.id}/print`} className="text-xs font-semibold text-emerald-800 hover:underline">
                  {t(locale, "common.print")}
                </Link>
              </>
            ) : null}
          </td>
        </tr>
      ))}
    </>
  );
}

function summaryText(locale: Locale, count: number, query: TicketListQuery) {
  if (count === 0) {
    return query.status === "all"
      ? t(locale, "dispatch.emptyAll")
      : t(locale, "tickets.emptyStatus", { status: statusLabel(locale, query.status) });
  }
  const noun = count === 1 ? t(locale, "dispatch.oneWo") : t(locale, "dispatch.manyWo");
  if (query.sort === "status" && query.status === "all") {
    return t(locale, "tickets.summaryGrouped", { count, noun });
  }
  if (query.status !== "all") {
    return t(locale, "dispatch.countStatus", { count, status: statusLabel(locale, query.status), noun });
  }
  return t(locale, "dispatch.countAll", { count, noun });
}
