import { DispatchAssignForm } from "@/components/DispatchAssignForm";
import { DispatchColumnList } from "@/components/DispatchColumnList";
import { DispatchWorkOrderCard } from "@/components/DispatchWorkOrderCard";
import { DISPATCH_STATUSES, STATUS_LABELS, type TicketStatus } from "@/lib/roles";
import { ticketStoreName } from "@/lib/stores";
import { formatSchedule } from "@/lib/schedule";

type TileTicket = {
  id: string;
  number: number;
  title: string;
  priority: string;
  status: string;
  technicianId: string | null;
  scheduledAt: Date | null;
  farmer: { name: string; store: { name: string } | null };
  pivot: { name: string } | null;
  store: { name: string } | null;
};

export function DispatchTilesBoard({
  tickets,
  technicians,
  canAssign,
}: {
  tickets: TileTicket[];
  technicians: { id: string; name: string }[];
  canAssign: boolean;
}) {
  return (
    <div className="mt-6 grid gap-3 lg:grid-cols-5">
      {DISPATCH_STATUSES.map((column) => {
        const items = tickets.filter((ticket) => ticket.status === column);
        return (
          <section key={column} className="flex min-h-48 flex-col rounded-xl border border-stone-200 bg-stone-50/80 p-2">
            <div className="flex shrink-0 items-center justify-between px-2 py-1">
              <h2 className="text-sm font-semibold">{STATUS_LABELS[column as TicketStatus]}</h2>
              <span className="text-xs text-stone-500">{items.length}</span>
            </div>
            <DispatchColumnList count={items.length}>
              {items.map((ticket) => (
                <DispatchWorkOrderCard
                  key={ticket.id}
                  variant="tile"
                  href={`/tickets/${ticket.id}`}
                  number={ticket.number}
                  title={ticket.title}
                  customer={ticket.farmer.name}
                  priority={ticket.priority}
                  status={ticket.status}
                >
                  <p className="mt-1 text-xs text-stone-600">
                    {[ticketStoreName(ticket), ticket.pivot?.name].filter(Boolean).join(" · ") || "No store or pivot"}
                  </p>
                  {ticket.scheduledAt ? (
                    <p className="mt-1 text-xs font-medium text-emerald-900">{formatSchedule(ticket.scheduledAt)}</p>
                  ) : null}
                  <DispatchAssignForm
                    ticketId={ticket.id}
                    technicianId={ticket.technicianId}
                    status={ticket.status}
                    canAssign={canAssign}
                    technicians={technicians}
                  />
                </DispatchWorkOrderCard>
              ))}
            </DispatchColumnList>
          </section>
        );
      })}
    </div>
  );
}
