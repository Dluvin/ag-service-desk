import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ticketWhere } from "@/lib/scope";
import { ClosedTicketPrintSelect } from "@/components/ClosedTicketPrintSelect";

export default async function BatchPrintSelectPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const tickets = await prisma.ticket.findMany({
    where: { ...ticketWhere(session), status: "COMPLETED" },
    include: { farmer: true },
    orderBy: [{ closedAt: "desc" }, { number: "desc" }],
  });

  return (
    <div>
      <p className="text-sm text-stone-600">
        <Link href="/tickets" className="text-emerald-800 hover:underline">
          Tickets
        </Link>
      </p>
      <h1 className="font-display mt-2 text-3xl">Batch print closed tickets</h1>
      <p className="mt-1 text-stone-600">
        Select the completed tickets to print. They open together so you can print or save one PDF.
      </p>
      {tickets.length === 0 ? (
        <p className="mt-6 rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600">
          There are no closed tickets to print yet.
        </p>
      ) : (
        <ClosedTicketPrintSelect
          tickets={tickets.map((ticket) => ({
            id: ticket.id,
            number: ticket.number,
            title: ticket.title,
            farmerName: ticket.farmer.name,
            invoiceNumber: ticket.invoiceNumber,
            closedAt: (ticket.closedAt ?? ticket.updatedAt).toISOString(),
          }))}
        />
      )}
    </div>
  );
}
