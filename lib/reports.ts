import { prisma } from "./prisma";
import type { SessionUser } from "./auth";
import { assetWhere, farmerWhere, farmWhere, pivotWhere, ticketWhere } from "./scope";
import { PRIORITIES, ROLES, STATUS_LABELS, TICKET_STATUSES } from "./roles";
import {
  storeAssetWhere,
  storeFarmerWhere,
  storeFarmWhere,
  storePivotWhere,
  storeTicketWhere,
  ticketStoreName,
} from "./stores";
import { STARTUP_SEASON_YEAR, inspectionLabel } from "./startup";
import { UNASSIGNED_FARM_LABEL } from "./farms";
import { ensureAssetTypes, isPivotAssetType } from "./assets";

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

const ticketReportInclude = {
  farmer: { include: { store: true } },
  store: true,
  pivot: { include: { farm: true } },
  technician: true,
  parts: { select: { quantity: true, unitPrice: true } },
  labor: { select: { hours: true, unitRate: true } },
} as const;

type ReportTicket = Awaited<ReturnType<typeof loadReportTickets>>[number];

function storeScope(session: SessionUser, store: string) {
  return session.role === ROLES.FARMER ? "all" : store;
}

async function loadReportTickets(session: SessionUser, store: string) {
  return prisma.ticket.findMany({
    where: { ...ticketWhere(session), ...(session.role === ROLES.FARMER ? {} : storeTicketWhere(store)) },
    include: ticketReportInclude,
    orderBy: { createdAt: "desc" },
  });
}

function isClosedTicket(ticket: { status: string }) {
  return ticket.status === "COMPLETED";
}

function isOpenTicket(ticket: { status: string }) {
  return ticket.status !== "COMPLETED" && ticket.status !== "CANCELLED";
}

function splitTickets(tickets: ReportTicket[], range: { start: Date; end: Date }) {
  const opened = tickets.filter((ticket) => inRange(ticket.createdAt, range.start, range.end));
  const closed = tickets.filter(
    (ticket) => isClosedTicket(ticket) && inRange(ticket.closedAt ?? ticket.updatedAt, range.start, range.end),
  );
  return { opened, closed };
}

function ticketSpend(ticket: ReportTicket) {
  return {
    invoice: ticket.invoiceAmount ?? 0,
    parts: moneyTotal(ticket.parts, "parts"),
    laborHours: ticket.labor.reduce((sum, item) => sum + item.hours, 0),
    labor: moneyTotal(ticket.labor, "labor"),
  };
}

function spendFor(closed: ReportTicket[]) {
  return closed.reduce(
    (sum, ticket) => {
      const money = ticketSpend(ticket);
      return {
        invoice: sum.invoice + money.invoice,
        parts: sum.parts + money.parts,
        laborHours: sum.laborHours + money.laborHours,
        labor: sum.labor + money.labor,
      };
    },
    { invoice: 0, parts: 0, laborHours: 0, labor: 0 },
  );
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

export async function loadCustomerReports(session: SessionUser, options: { store: string; from?: string; to?: string }) {
  const range = parseReportRange(options.from, options.to);
  const store = storeScope(session, options.store);
  const storeFarmers = session.role === ROLES.FARMER ? {} : storeFarmerWhere(store);

  const [tickets, farmers] = await Promise.all([
    loadReportTickets(session, store),
    prisma.farmer.findMany({
      where: { ...farmerWhere(session), ...storeFarmers },
      include: {
        store: { select: { name: true } },
        _count: { select: { farms: true, pivots: true, assets: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const { opened, closed } = splitTickets(tickets, range);
  const totals = spendFor(closed);

  const rows = farmers
    .map((farmer) => {
      const openedRows = opened.filter((ticket) => ticket.farmerId === farmer.id);
      const closedRows = closed.filter((ticket) => ticket.farmerId === farmer.id);
      const spend = spendFor(closedRows);
      return {
        id: farmer.id,
        name: farmer.name,
        store: farmer.store?.name ?? "No store",
        farms: farmer._count.farms,
        pivots: farmer._count.pivots,
        assets: farmer._count.assets,
        opened: openedRows.length,
        closed: closedRows.length,
        openNow: tickets.filter((ticket) => ticket.farmerId === farmer.id && isOpenTicket(ticket)).length,
        invoice: spend.invoice,
        parts: spend.parts,
        laborHours: spend.laborHours,
        labor: spend.labor,
      };
    })
    .sort((a, b) => b.opened - a.opened || b.invoice - a.invoice || a.name.localeCompare(b.name));

  return {
    range,
    customers: farmers.length,
    withWork: rows.filter((row) => row.opened > 0).length,
    opened: opened.length,
    closed: closed.length,
    openNow: tickets.filter(isOpenTicket).length,
    invoice: totals.invoice,
    parts: totals.parts,
    laborHours: totals.laborHours,
    labor: totals.labor,
    rows,
  };
}

export async function loadFarmReports(session: SessionUser, options: { store: string; from?: string; to?: string }) {
  const range = parseReportRange(options.from, options.to);
  const store = storeScope(session, options.store);
  const storeFarms = session.role === ROLES.FARMER ? {} : storeFarmWhere(store);

  const [tickets, farms] = await Promise.all([
    loadReportTickets(session, store),
    prisma.farm.findMany({
      where: { ...farmWhere(session), ...storeFarms },
      include: {
        farmer: { select: { id: true, name: true, store: { select: { name: true } } } },
        _count: { select: { pivots: true, assets: true } },
      },
      orderBy: [{ name: "asc" }, { farmer: { name: "asc" } }],
    }),
  ]);

  const { opened, closed } = splitTickets(tickets, range);
  const totals = spendFor(closed);

  function farmKey(ticket: ReportTicket) {
    return ticket.pivot.farmId ?? "unassigned";
  }

  const lastByFarm = new Map<string, Date>();
  for (const ticket of tickets) {
    const key = farmKey(ticket);
    const last = lastByFarm.get(key);
    if (!last || ticket.createdAt > last) lastByFarm.set(key, ticket.createdAt);
  }

  const rows = farms
    .map((farm) => {
      const openedRows = opened.filter((ticket) => ticket.pivot.farmId === farm.id);
      const closedRows = closed.filter((ticket) => ticket.pivot.farmId === farm.id);
      const spend = spendFor(closedRows);
      return {
        id: farm.id,
        name: farm.name,
        customerId: farm.farmer.id,
        customer: farm.farmer.name,
        store: farm.farmer.store?.name ?? "No store",
        pivots: farm._count.pivots,
        assets: farm._count.assets,
        opened: openedRows.length,
        closed: closedRows.length,
        openNow: tickets.filter((ticket) => ticket.pivot.farmId === farm.id && isOpenTicket(ticket)).length,
        invoice: spend.invoice,
        parts: spend.parts,
        laborHours: spend.laborHours,
        labor: spend.labor,
        lastTicketAt: lastByFarm.get(farm.id) ?? null,
      };
    })
    .sort((a, b) => b.opened - a.opened || b.invoice - a.invoice || a.name.localeCompare(b.name));

  const unopened = opened.filter((ticket) => !ticket.pivot.farmId);
  const unclosed = closed.filter((ticket) => !ticket.pivot.farmId);
  const unassignedTickets = tickets.filter((ticket) => !ticket.pivot.farmId);
  if (unassignedTickets.length > 0) {
    const spend = spendFor(unclosed);
    rows.push({
      id: "unassigned",
      name: UNASSIGNED_FARM_LABEL,
      customerId: "",
      customer: "—",
      store: "—",
      pivots: new Set(unassignedTickets.map((ticket) => ticket.pivotId)).size,
      assets: 0,
      opened: unopened.length,
      closed: unclosed.length,
      openNow: unassignedTickets.filter(isOpenTicket).length,
      invoice: spend.invoice,
      parts: spend.parts,
      laborHours: spend.laborHours,
      labor: spend.labor,
      lastTicketAt: lastByFarm.get("unassigned") ?? null,
    });
    rows.sort((a, b) => b.opened - a.opened || b.invoice - a.invoice || a.name.localeCompare(b.name));
  }

  return {
    range,
    farms: farms.length,
    withWork: rows.filter((row) => row.opened > 0).length,
    opened: opened.length,
    closed: closed.length,
    openNow: tickets.filter(isOpenTicket).length,
    invoice: totals.invoice,
    parts: totals.parts,
    laborHours: totals.laborHours,
    labor: totals.labor,
    rows,
  };
}

export async function loadAssetReports(session: SessionUser, options: { store: string; from?: string; to?: string }) {
  const range = parseReportRange(options.from, options.to);
  const store = storeScope(session, options.store);
  const storePivots = session.role === ROLES.FARMER ? {} : storePivotWhere(store);
  const storeAssets = session.role === ROLES.FARMER ? {} : storeAssetWhere(store);

  const [tickets, pivots, assets, types] = await Promise.all([
    loadReportTickets(session, store),
    prisma.pivot.findMany({
      where: { ...pivotWhere(session), ...storePivots },
      include: {
        farmer: { include: { store: true } },
        farm: { select: { name: true } },
      },
      orderBy: [{ farmer: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.asset.findMany({
      where: { ...assetWhere(session), ...storeAssets },
      include: {
        farmer: { include: { store: true } },
        farm: { select: { name: true } },
        assetType: true,
      },
      orderBy: [{ assetType: { sortOrder: "asc" } }, { name: "asc" }],
    }),
    ensureAssetTypes(session.organizationId),
  ]);

  const { opened, closed } = splitTickets(tickets, range);
  const totals = spendFor(closed);

  const openByPivot = new Map<string, number>();
  const lastByPivot = new Map<string, Date>();
  for (const ticket of tickets) {
    openByPivot.set(ticket.pivotId, (openByPivot.get(ticket.pivotId) ?? 0) + (isOpenTicket(ticket) ? 1 : 0));
    const last = lastByPivot.get(ticket.pivotId);
    if (!last || ticket.createdAt > last) lastByPivot.set(ticket.pivotId, ticket.createdAt);
  }

  const pivotRows = pivots
    .map((pivot) => {
      const openedRows = opened.filter((ticket) => ticket.pivotId === pivot.id);
      const closedRows = closed.filter((ticket) => ticket.pivotId === pivot.id);
      const spend = spendFor(closedRows);
      return {
        id: pivot.id,
        name: pivot.name,
        href: `/pivots/${pivot.id}`,
        typeName: "Pivots",
        customerId: pivot.farmerId,
        customer: pivot.farmer.name,
        farm: pivot.farm?.name ?? UNASSIGNED_FARM_LABEL,
        store: pivot.farmer.store?.name ?? "No store",
        opened: openedRows.length,
        closed: closedRows.length,
        openNow: openByPivot.get(pivot.id) ?? 0,
        invoice: spend.invoice,
        lastTicketAt: lastByPivot.get(pivot.id) ?? null,
      };
    })
    .sort((a, b) => b.opened - a.opened || a.name.localeCompare(b.name));

  const genericRows = assets.map((asset) => ({
    id: asset.id,
    name: asset.name,
    href: `/assets/${asset.id}`,
    typeName: asset.assetType.name,
    typeSlug: asset.assetType.slug,
    customerId: asset.farmerId,
    customer: asset.farmer.name,
    farm: asset.farm?.name ?? UNASSIGNED_FARM_LABEL,
    store: asset.farmer.store?.name ?? "No store",
  }));

  const byType = types.map((type) => {
    if (isPivotAssetType(type)) {
      const typePivots = pivotRows;
      return {
        slug: type.slug,
        name: type.name,
        count: typePivots.length,
        withWork: typePivots.filter((row) => row.opened > 0).length,
        openNow: typePivots.filter((row) => row.openNow > 0).length,
        opened: typePivots.reduce((sum, row) => sum + row.opened, 0),
        closed: typePivots.reduce((sum, row) => sum + row.closed, 0),
        invoice: typePivots.reduce((sum, row) => sum + row.invoice, 0),
      };
    }
    const typeAssets = genericRows.filter((row) => row.typeSlug === type.slug);
    return {
      slug: type.slug,
      name: type.name,
      count: typeAssets.length,
      withWork: 0,
      openNow: 0,
      opened: 0,
      closed: 0,
      invoice: 0,
    };
  });

  return {
    range,
    total: pivots.length + assets.length,
    pivots: pivots.length,
    generic: assets.length,
    withOpenWork: pivotRows.filter((row) => row.openNow > 0).length,
    quietPivots: pivotRows.filter((row) => row.opened === 0).length,
    opened: opened.length,
    closed: closed.length,
    invoice: totals.invoice,
    byType,
    pivotRows: pivotRows.filter((row) => row.opened > 0 || row.openNow > 0).slice(0, 75),
    genericRows,
  };
}
