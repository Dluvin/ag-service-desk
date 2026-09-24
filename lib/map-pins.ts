import { OPEN_TICKET_STATUSES, STATUS_LABELS, type TicketStatus } from "./roles";
import { ticketSite } from "./ticket-site";

export type MapPin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  subtitle?: string;
  href?: string;
  kind?: "ticket" | "vehicle" | "place" | "person";
  hrefLabel?: string;
  onSite?: boolean;
  onSiteTicketId?: string;
  onSitePivotId?: string;
};

export { OPEN_TICKET_STATUSES };

export function ticketPins(
  tickets: {
    id: string;
    number: number;
    title: string;
    status: string;
    farmer: { name: string };
    pivot?: { name: string; latitude: number; longitude: number } | null;
    asset?: { name: string; latitude: number; longitude: number; assetType?: { name: string } | null } | null;
    technician: { name: string } | null;
  }[],
): MapPin[] {
  return tickets.flatMap((ticket) => {
    const site = ticketSite(ticket);
    if (!site) return [];
    return [
      {
        id: ticket.id,
        name: `#${ticket.number} ${site.name}`,
        lat: site.latitude,
        lng: site.longitude,
        subtitle: `${ticket.farmer.name} · ${STATUS_LABELS[ticket.status as TicketStatus] ?? ticket.status.replaceAll("_", " ").toLowerCase()} · ${ticket.technician?.name ?? "Unassigned"}`,
        href: `/tickets/${ticket.id}`,
      },
    ];
  });
}
