import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ticketWhere } from "@/lib/scope";
import { ClosedTicketPrintSelect } from "@/components/ClosedTicketPrintSelect";
import { StoreFilter } from "@/components/StoreFilter";
import { PRINTABLE_STATUSES, STATUS_LABELS, ROLES, canAssignTickets, type TicketStatus } from "@/lib/roles";
import { orgQbwcIsOn } from "@/lib/ocr-samples";
import { parseStoreParam, storeTicketWhere } from "@/lib/stores";
import { printListStatus, printSelectHref } from "@/lib/ticket-print";
import { ticketQuickBooksCustomer } from "@/lib/qbwc-xml";

const STATUS_FILTERS: { id: TicketStatus | "ALL"; name: string }[] = [
  { id: "REPAIR_DONE", name: "Repair done" },
  { id: "COMPLETED", name: "Completed" },
  { id: "ALL", name: "All printable" },
];

export default async function BatchPrintSelectPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[]; store?: string | string[] }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const query = await searchParams;
  const listStatus = printListStatus(query.status);
  const status = listStatus === "ALL" ? undefined : listStatus;
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
  const canSendQuickBooks = canAssignTickets(session.role) && (await orgQbwcIsOn(session.organizationId));

  const tickets = await prisma.ticket.findMany({
    where: {
      ...ticketWhere(session),
      ...storeTickets,
      status: status ? status : { in: PRINTABLE_STATUSES },
    },
    include: {
      farmer: { include: { farms: { select: { qbCustomerName: true, name: true } } } },
      pivot: { include: { farm: { select: { qbCustomerName: true, name: true } } } },
      asset: { include: { farm: { select: { qbCustomerName: true, name: true } } } },
    },
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
      ? canSendQuickBooks
        ? "Select repair-done work orders to print, or send the checked ones to QuickBooks."
        : "Select repair-done work orders to print. Each printout includes repair notes, parts, equipment, and labor."
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
      <p className="mt-1 text-stone-600">
        {blurb}
        {canSendQuickBooks ? " Auto updates are every 15 minutes on the QuickBooks Web Connector." : ""}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => {
          const href = printSelectHref({ status: filter.id, store: selectedStore });
          const active = filter.id === listStatus;
          return (
            <Link
              key={filter.id}
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
          extra={{ status: listStatus }}
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
            qbCustomerName: ticketQuickBooksCustomer(ticket),
            status: ticket.status,
            statusLabel: STATUS_LABELS[ticket.status as TicketStatus] ?? ticket.status,
            invoiceNumber: ticket.invoiceNumber,
            datedAt: (ticket.closedAt ?? ticket.updatedAt).toISOString(),
          }))}
          status={listStatus}
          store={selectedStore}
          canSendQuickBooks={canSendQuickBooks}
        />
      )}
    </div>
  );
}
