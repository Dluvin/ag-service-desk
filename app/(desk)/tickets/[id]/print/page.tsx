import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ticketWhere } from "@/lib/scope";
import { isPrintableStatus } from "@/lib/roles";
import { ClosedTicketDocument } from "@/components/ClosedTicketDocument";
import { PrintButton } from "@/components/PrintButton";

export default async function ClosedTicketPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;

  const ticket = await prisma.ticket.findFirst({
    where: { id, ...ticketWhere(session) },
    include: {
      organization: true,
      farmer: { include: { contacts: { orderBy: { name: "asc" } } } },
      pivot: true,
      technician: true,
      updates: { include: { user: true }, orderBy: { createdAt: "asc" } },
      parts: { orderBy: { createdAt: "asc" } },
      siteVisits: { orderBy: { startedAt: "asc" } },
    },
  });
  if (!ticket) notFound();
  if (!isPrintableStatus(ticket.status)) {
    redirect(`/tickets/${ticket.id}`);
  }

  return (
    <div>
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/tickets/${ticket.id}`} className="text-sm text-emerald-800 hover:underline">
          Back to ticket
        </Link>
        <div className="text-right">
          <PrintButton />
          <p className="mt-1 text-xs text-stone-500">In the print dialog, choose Save as PDF.</p>
        </div>
      </div>
      <ClosedTicketDocument ticket={ticket} />
    </div>
  );
}
