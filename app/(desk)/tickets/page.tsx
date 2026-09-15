import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ticketWhere } from "@/lib/scope";
import { StatusBadge, PriorityBadge } from "@/components/Badges";

export default async function TicketsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const tickets = await prisma.ticket.findMany({
    where: ticketWhere(session),
    include: { farmer: true, pivot: true, technician: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Service tickets</h1>
        <Link href="/tickets/new" className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
          New ticket
        </Link>
      </div>
      <div className="mt-6 overflow-hidden rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-2">Ticket</th>
              <th className="px-4 py-2">Farmer / pivot</th>
              <th className="px-4 py-2">Technician</th>
              <th className="px-4 py-2">Priority</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Invoice</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-stone-50">
                <td className="px-4 py-3">
                  <Link href={`/tickets/${ticket.id}`} className="font-medium text-emerald-900 hover:underline">
                    #{ticket.number} {ticket.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-stone-600">
                  {ticket.farmer.name}
                  <br />
                  {ticket.pivot.name}
                </td>
                <td className="px-4 py-3">{ticket.technician?.name ?? "Unassigned"}</td>
                <td className="px-4 py-3">
                  <PriorityBadge priority={ticket.priority} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={ticket.status} />
                </td>
                <td className="px-4 py-3">
                  {ticket.invoiceNumber ? (
                    <span className="text-stone-700">{ticket.invoiceNumber}</span>
                  ) : ticket.status === "COMPLETED" ? (
                    <span className="text-red-700">Missing</span>
                  ) : (
                    "—"
                  )}
                  {ticket.status === "COMPLETED" && ticket.invoiceNumber ? (
                    <>
                      <br />
                      <Link href={`/tickets/${ticket.id}/print`} className="text-xs text-emerald-800 hover:underline">
                        Print / PDF
                      </Link>
                    </>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
