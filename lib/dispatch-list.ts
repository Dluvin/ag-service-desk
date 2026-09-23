import { TICKET_STATUSES, isFinishedStatus, type TicketStatus } from "./roles";
import { STORE_ALL } from "./stores";

export type DispatchListQuery = {
  statuses: TicketStatus[];
  hideCompleted: boolean;
};

export function parseStatusParam(value: string | string[] | undefined): TicketStatus[] {
  const raw = Array.isArray(value) ? value.flatMap((item) => item.split(",")) : (value ?? "").split(",");
  const unique: TicketStatus[] = [];
  for (const item of raw) {
    const status = item.trim().toUpperCase() as TicketStatus;
    if (TICKET_STATUSES.includes(status) && !unique.includes(status)) {
      unique.push(status);
    }
  }
  return unique;
}

export function parseDispatchListQuery(query: {
  status?: string | string[];
  closed?: string;
}): DispatchListQuery {
  return {
    statuses: parseStatusParam(query.status),
    hideCompleted: query.closed !== "1",
  };
}

export function dispatchVisibleStatuses(query: DispatchListQuery): TicketStatus[] {
  const base = query.statuses.length > 0 ? query.statuses : [...TICKET_STATUSES];
  if (query.hideCompleted) return base.filter((status) => !isFinishedStatus(status));
  return base;
}

export function filterDispatchTickets<T extends { status: string }>(tickets: T[], query: DispatchListQuery): T[] {
  const allowed = new Set<string>(dispatchVisibleStatuses(query));
  return tickets.filter((ticket) => allowed.has(ticket.status));
}

export function dispatchHref(input: {
  store?: string;
  month?: string;
  statuses?: TicketStatus[];
  hideCompleted?: boolean;
}) {
  const params = new URLSearchParams();
  if (input.store && input.store !== STORE_ALL) params.set("store", input.store);
  if (input.month) params.set("month", input.month);
  if (input.statuses && input.statuses.length > 0) params.set("status", input.statuses.join(","));
  if (input.hideCompleted === false) params.set("closed", "1");
  const qs = params.toString();
  return qs ? `/dispatch?${qs}` : "/dispatch";
}

export function dispatchFilterExtra(query: DispatchListQuery & { month?: string }) {
  return {
    month: query.month,
    status: query.statuses.length > 0 ? query.statuses.join(",") : undefined,
    closed: query.hideCompleted ? undefined : "1",
  };
}
