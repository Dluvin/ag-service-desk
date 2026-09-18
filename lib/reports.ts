import { prisma } from "./prisma";
import type { SessionUser } from "./auth";
import { pivotWhere, ticketWhere } from "./scope";
import { PRIORITIES, ROLES, STATUS_LABELS, TICKET_STATUSES } from "./roles";
import { storePivotWhere, storeTicketWhere, ticketStoreName } from "./stores";
import { STARTUP_SEASON_YEAR, inspectionLabel } from "./startup";

export function toDayParam(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseReportRange(from?: string, to?: string) {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const start = parseDay(from) ?? yearStart;
  const endDay = parseDay(to) ?? now;
  const end = new Date(endDay.getFullYear(), endDay.getMonth(), endDay.getDate(), 23, 59, 59, 999);
  return { start, end, from: toDayParam(start), to: toDayParam(endDay) };
}

function parseDay(value: string | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function inRange(value: Date | string | null | undefined, start: Date, end: Date) {
  if (!value) return false;
  const date = value instanceof Date ? value : new Date(value);
  return date >= start && date <= end;
}

function moneyTotal(rows: { quantity?: number; hours?: number; unitPrice?: number | null; unitRate?: number | null }[], kind: "parts" | "labor") {
  return rows.reduce((sum, row) => {
    const qty = kind === "parts" ? (row.quantity ?? 0) : (row.hours ?? 0);
    const rate = kind === "parts" ? (row.unitPrice ?? 0) : (row.unitRate ?? 0);
    return sum + qty * rate;
  }, 0);
}

export async function loadReports(session: SessionUser, options: { store: string; from?: string; to?: string }) {
  const range = parseReportRange(options.from, options.to);
  const storeTickets = session.role === ROLES.FARMER ? {} : storeTicketWhere(options.store);
  const storePivots = session.role === ROLES.FARMER ? {} : storePivotWhere(options.store);

  const [tickets, pivots] = await Promise.all([
    prisma.ticket.findMany({
      where: { ...ticketWhere(session), ...storeTickets },
      include: {
        farmer: { include: { store: true } },
        store: true,
        pivot: true,
        technician: true,
        parts: { select: { quantity: true, unitPrice: true } },
        labor: { select: { hours: true, unitRate: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.pivot.findMany({
      where: { ...pivotWhere(session), ...storePivots },
      include: {
        farmer: { include: { store: true } },
        inspections: {
          where: { seasonYear: STARTUP_SEASON_YEAR },
          select: { status: true },
        },
      },
      orderBy: [{ farmer: { name: "asc" } }, { name: "asc" }],
    }),
  ]);

  const opened = tickets.filter((ticket) => inRange(ticket.createdAt, range.start, range.end));
  const closed = tickets.filter(
    (ticket) => ticket.status === "COMPLETED" && inRange(ticket.closedAt ?? ticket.updatedAt, range.start, range.end),
  );

  const byStatus = TICKET_STATUSES.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    opened: opened.filter((ticket) => ticket.status === status).length,
    all: tickets.filter((ticket) => ticket.status === status).length,
  }));

  const byPriority = PRIORITIES.map((priority) => ({
    priority,
    opened: opened.filter((ticket) => ticket.priority === priority).length,
  }));

  const techNames = new Map<string, string>();
  for (const ticket of opened) {
    const key = ticket.technicianId ?? "unassigned";
    techNames.set(key, ticket.technician?.name ?? "Unassigned");
  }
  const byTechnician = [...techNames.entries()]
    .map(([id, name]) => ({
      name,
      opened: opened.filter((ticket) => (ticket.technicianId ?? "unassigned") === id).length,
      closed: closed.filter((ticket) => (ticket.technicianId ?? "unassigned") === id).length,
    }))
    .sort((a, b) => b.opened - a.opened);

  const storeNames = new Map<string, string>();
  for (const ticket of opened) {
    const name = ticketStoreName(ticket) ?? "No store";
    storeNames.set(name, name);
  }
  const byStore = [...storeNames.keys()]
    .map((name) => ({
      name,
      opened: opened.filter((ticket) => (ticketStoreName(ticket) ?? "No store") === name).length,
      closed: closed.filter((ticket) => (ticketStoreName(ticket) ?? "No store") === name).length,
      invoice: closed
        .filter((ticket) => (ticketStoreName(ticket) ?? "No store") === name)
        .reduce((sum, ticket) => sum + (ticket.invoiceAmount ?? 0), 0),
    }))
    .sort((a, b) => b.opened - a.opened);

  const invoiceTotal = closed.reduce((sum, ticket) => sum + (ticket.invoiceAmount ?? 0), 0);
  const partsTotal = closed.reduce((sum, ticket) => sum + moneyTotal(ticket.parts, "parts"), 0);
  const laborHours = closed.reduce((sum, ticket) => sum + ticket.labor.reduce((hrs, item) => hrs + item.hours, 0), 0);
  const laborTotal = closed.reduce((sum, ticket) => sum + moneyTotal(ticket.labor, "labor"), 0);

  const ticketsInRangeByPivot = new Map<string, number>();
  const openByPivot = new Map<string, number>();
  const lastByPivot = new Map<string, Date>();
  for (const ticket of tickets) {
    openByPivot.set(ticket.pivotId, (openByPivot.get(ticket.pivotId) ?? 0) + (ticket.status === "COMPLETED" || ticket.status === "CANCELLED" ? 0 : 1));
    const last = lastByPivot.get(ticket.pivotId);
    if (!last || ticket.createdAt > last) lastByPivot.set(ticket.pivotId, ticket.createdAt);
    if (inRange(ticket.createdAt, range.start, range.end)) {
      ticketsInRangeByPivot.set(ticket.pivotId, (ticketsInRangeByPivot.get(ticket.pivotId) ?? 0) + 1);
    }
  }

  const pivotRows = pivots.map((pivot) => {
    const inspection = pivot.inspections[0];
    return {
      id: pivot.id,
      name: pivot.name,
      farm: pivot.farmer.name,
      farmId: pivot.farmerId,
      store: pivot.farmer.store?.name ?? "No store",
      ticketsInRange: ticketsInRangeByPivot.get(pivot.id) ?? 0,
      openTickets: openByPivot.get(pivot.id) ?? 0,
      lastTicketAt: lastByPivot.get(pivot.id) ?? null,
      startup: inspection ? inspectionLabel(inspection.status) : "Not started",
    };
  });

  const busiestPivots = [...pivotRows]
    .filter((row) => row.ticketsInRange > 0)
    .sort((a, b) => b.ticketsInRange - a.ticketsInRange || a.name.localeCompare(b.name))
    .slice(0, 50);
  const openPivots = pivotRows.filter((row) => row.openTickets > 0).sort((a, b) => b.openTickets - a.openTickets);
  const quietPivots = pivotRows.filter((row) => row.ticketsInRange === 0).length;

  return {
    range,
    ticket: {
      opened: opened.length,
      closed: closed.length,
      openNow: tickets.filter((ticket) => ticket.status !== "COMPLETED" && ticket.status !== "CANCELLED").length,
      invoiceTotal,
      partsTotal,
      laborHours,
      laborTotal,
      byStatus,
      byPriority,
      byTechnician,
      byStore,
      closedRows: closed.slice(0, 75).map((ticket) => ({
        id: ticket.id,
        number: ticket.number,
        title: ticket.title,
        farm: ticket.farmer.name,
        pivot: ticket.pivot.name,
        technician: ticket.technician?.name ?? "Unassigned",
        store: ticketStoreName(ticket),
        invoiceNumber: ticket.invoiceNumber,
        invoiceAmount: ticket.invoiceAmount,
        partsTotal: moneyTotal(ticket.parts, "parts"),
        laborHours: ticket.labor.reduce((sum, item) => sum + item.hours, 0),
        closedAt: ticket.closedAt ?? ticket.updatedAt,
      })),
    },
    pivot: {
      total: pivots.length,
      withOpenWork: openPivots.length,
      quietInRange: quietPivots,
      startupPassed: pivotRows.filter((row) => row.startup === "Passed").length,
      startupFailed: pivotRows.filter((row) => row.startup.startsWith("Failed")).length,
      busiest: busiestPivots,
      openWork: openPivots.slice(0, 50),
    },
  };
}
