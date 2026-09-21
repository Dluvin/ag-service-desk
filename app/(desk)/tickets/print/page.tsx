import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ticketWhere } from "@/lib/scope";
import { ClosedTicketPrintSelect } from "@/components/ClosedTicketPrintSelect";
import { StoreFilter } from "@/components/StoreFilter";
import { PRINTABLE_STATUSES, STATUS_LABELS, ROLES, type TicketStatus } from "@/lib/roles";
import { parseStoreParam, storeTicketWhere } from "@/lib/stores";
import { parsePrintableStatusParam, printSelectHref } from "@/lib/ticket-print";

const STATUS_FILTERS: { id?: TicketStatus; name: string }[] = [
  { name: "All printable" },
  { id: "REPAIR_DONE", name: "Repair done" },
  { id: "COMPLETED", name: "Completed" },
];

export default async function BatchPrintSelectPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[]; store?: string | string[] }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const query = await searchParams;
  const status = parsePrintableStatusParam(query.status);
  const stores =
    session.role === ROLES.FARMER
      ? []
      : await prisma.store.findMany({
          where: { organizationId: session.organizationId },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        });
  const selectedStore = parseStoreParam(Array.isArray(query.store) ? query.store[0] : query.store, stores);
  const storeTickets = session.role === ROLES.FARMER ? {} : storeTicketWhere(selectedStore);

  const tickets = await prisma.ticket.findMany({
    where: {
      ...ticketWhere(session),
      ...storeTickets,
      status: status ? status : { in: PRINTABLE_STATUSES },
    },
    include: { farmer: true },
    orderBy: [{ closedAt: "desc" }, { number: "desc" }],
  });

  const heading =
    status === "REPAIR_DONE"
      ? "Print repair-done work orders"
      : status === "COMPLETED"
        ? "Print completed work orders"
        : "Batch print work orders";
  const blurb =
    status === "REPAIR_DONE"
      ? "Select repair-done work orders to print. Each printout includes repair notes, parts, equipment, and labor."
      : status === "COMPLETED"
        ? "Select completed work orders to print. They open together so you can print or save one PDF."
        : "Select completed or repair-done work orders to print. They open together so you can print or save one PDF.";
  const empty =
    status === "REPAIR_DONE"
      ? "There are no repair-done work orders to print yet."
      : status === "COMPLETED"
        ? "There are no completed work orders to print yet."
        : "There are no printable work orders yet.";

  return (
    <div>
      <p className="text-sm text-stone-600">
        <Link href="/tickets" className="text-emerald-800 hover:underline">
          Work orders
        </Link>
      </p>
      <h1 className="font-display mt-2 text-3xl">{heading}</h1>
      <p className="mt-1 text-stone-600">{blurb}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => {
          const href = printSelectHref({ status: filter.id, store: selectedStore });
          const active = filter.id === status;
          return (
            <Link
              key={filter.id ?? "all"}
              href={href}
              className={
                active
                  ? "rounded-full bg-emerald-800 px-3 py-1 text-sm font-semibold text-white"
                  : "rounded-full border border-stone-300 bg-white px-3 py-1 text-sm text-stone-700 hover:border-emerald-700"
              }
            >
              {filter.name}
            </Link>
          );
        })}
      </div>
      {session.role !== ROLES.FARMER ? (
        <StoreFilter
          stores={stores}
          selected={selectedStore}
          pathname="/tickets/print"
          extra={status ? { status } : undefined}
        />
      ) : null}
      {tickets.length === 0 ? (
        <p className="mt-6 rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600">{empty}</p>
      ) : (
        <ClosedTicketPrintSelect
          tickets={tickets.map((ticket) => ({
            id: ticket.id,
            number: ticket.number,
            title: ticket.title,
            farmerName: ticket.farmer.name,
            status: ticket.status,
            statusLabel: STATUS_LABELS[ticket.status as TicketStatus] ?? ticket.status,
            invoiceNumber: ticket.invoiceNumber,
            datedAt: (ticket.closedAt ?? ticket.updatedAt).toISOString(),
          }))}
          status={status}
          store={selectedStore}
        />
      )}
    </div>
  );
}
