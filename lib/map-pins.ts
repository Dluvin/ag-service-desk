import { OPEN_TICKET_STATUSES } from "./roles";

export type MapPin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  subtitle?: string;
  href?: string;
  kind?: "ticket" | "vehicle";
};

export { OPEN_TICKET_STATUSES };

export function ticketPins(
  tickets: {
    id: string;
    number: number;
    title: string;
    status: string;
    farmer: { name: string };
    pivot: { name: string; latitude: number; longitude: number };
    technician: { name: string } | null;
  }[],
): MapPin[] {
  return tickets.map((ticket) => ({
    id: ticket.id,
    name: `#${ticket.number} ${ticket.pivot.name}`,
    lat: ticket.pivot.latitude,
    lng: ticket.pivot.longitude,
    subtitle: `${ticket.farmer.name} · ${ticket.status.replaceAll("_", " ").toLowerCase()} · ${ticket.technician?.name ?? "Unassigned"}`,
    href: `/tickets/${ticket.id}`,
  }));
}
