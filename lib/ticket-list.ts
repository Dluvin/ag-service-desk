import { TICKET_STATUSES, type TicketStatus } from "./roles";

export const TICKET_LIST_SORTS = ["status", "opened", "scheduled"] as const;
export type TicketListSort = (typeof TICKET_LIST_SORTS)[number];
export type TicketListDir = "asc" | "desc";
export type TicketListStatus = TicketStatus | "all";

export type TicketListQuery = {
  status: TicketListStatus;
  sort: TicketListSort;
  dir: TicketListDir;
};

export function parseTicketListQuery(query: { status?: string; sort?: string; dir?: string }): TicketListQuery {
  const status = TICKET_STATUSES.includes(query.status as TicketStatus) ? (query.status as TicketStatus) : "all";
  const sort = TICKET_LIST_SORTS.includes(query.sort as TicketListSort) ? (query.sort as TicketListSort) : "status";
  const dir = query.dir === "asc" || query.dir === "desc" ? query.dir : defaultDirForSort(sort);
  return { status, sort, dir };
}

export function defaultDirForSort(sort: TicketListSort): TicketListDir {
  return sort === "status" ? "asc" : "desc";
}

export function ticketListHref(query: TicketListQuery) {
  const params = new URLSearchParams();
  if (query.status !== "all") params.set("status", query.status);
  if (query.sort !== "status") params.set("sort", query.sort);
  if (query.dir !== defaultDirForSort(query.sort)) params.set("dir", query.dir);
  const qs = params.toString();
  return qs ? `/tickets?${qs}` : "/tickets";
}

export function sortTickets<T extends { status: string; createdAt: Date; scheduledAt: Date | null; updatedAt: Date }>(
  tickets: T[],
  query: TicketListQuery,
): T[] {
  return [...tickets].sort((a, b) => {
    if (query.sort === "status") {
      const diff = statusRank(a.status) - statusRank(b.status);
      if (diff !== 0) return query.dir === "desc" ? -diff : diff;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    }
    if (query.sort === "opened") {
      return compareTimes(a.createdAt.getTime(), b.createdAt.getTime(), query.dir);
    }
    const scheduled = compareNullableTimes(a.scheduledAt, b.scheduledAt, query.dir);
    if (scheduled !== 0) return scheduled;
    return compareTimes(a.createdAt.getTime(), b.createdAt.getTime(), query.dir);
  });
}

export function groupTicketsByStatus<T extends { status: string }>(tickets: T[]) {
  const groups: { status: TicketStatus; tickets: T[] }[] = [];
  for (const ticket of tickets) {
    const status = (TICKET_STATUSES.includes(ticket.status as TicketStatus) ? ticket.status : "OPEN") as TicketStatus;
    const last = groups[groups.length - 1];
    if (last && last.status === status) last.tickets.push(ticket);
    else groups.push({ status, tickets: [ticket] });
  }
  return groups;
}

function statusRank(status: string) {
  const index = TICKET_STATUSES.indexOf(status as TicketStatus);
  return index === -1 ? TICKET_STATUSES.length : index;
}

function compareTimes(a: number, b: number, dir: TicketListDir) {
  return dir === "asc" ? a - b : b - a;
}

function compareNullableTimes(a: Date | null, b: Date | null, dir: TicketListDir) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return compareTimes(a.getTime(), b.getTime(), dir);
}
