import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ticketWhere } from "@/lib/scope";
import { ClosedTicketDocument } from "@/components/ClosedTicketDocument";
import { PrintButton } from "@/components/PrintButton";
import { PRINTABLE_STATUSES } from "@/lib/roles";
import { closedTicketPrintInclude, firstQueryValue, parsePrintableStatusParam, parseTicketIdList, printSelectHref } from "@/lib/ticket-print";

export default async function BatchPrintTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string | string[]; status?: string | string[]; store?: string | string[] }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const query = await searchParams;
  const status = parsePrintableStatusParam(query.status);
  const store = firstQueryValue(query.store);
  const backHref = printSelectHref({ status, store });
  const ids = parseTicketIdList(query.ids);
  if (ids.length === 0) redirect(backHref);

  const found = await prisma.ticket.findMany({
    where: {
      ...ticketWhere(session),
      status: { in: PRINTABLE_STATUSES },
      id: { in: ids },
    },
    include: closedTicketPrintInclude,
  });
  const byId = new Map(found.map((ticket) => [ticket.id, ticket]));
  const tickets = ids.map((id) => byId.get(id)).filter((ticket) => ticket != null);

  if (tickets.length === 0) redirect(backHref);

  return (
    <div>
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href={backHref} className="text-sm text-emerald-800 hover:underline">
          Back to selection
        </Link>
        <div className="text-right">
          <PrintButton label={`Print ${tickets.length} work order${tickets.length === 1 ? "" : "s"}`} />
          <p className="mt-1 text-xs text-stone-500">Each work order starts on a new page. In the print dialog, choose Save as PDF if you want a file.</p>
        </div>
      </div>
      <div className="space-y-8 print:space-y-0">
        {tickets.map((ticket, index) => (
          <div key={ticket.id} className={index < tickets.length - 1 ? "print-page" : undefined}>
            <ClosedTicketDocument ticket={ticket} />
          </div>
        ))}
      </div>
    </div>
  );
}
