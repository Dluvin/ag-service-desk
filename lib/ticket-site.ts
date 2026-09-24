export type TicketSiteSource = {
  pivotId?: string | null;
  assetId?: string | null;
  pivot?: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    serialNumber?: string | null;
    locationNote?: string | null;
  } | null;
  asset?: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    serialNumber?: string | null;
    locationNote?: string | null;
    assetType?: { name: string } | null;
  } | null;
};

export type TicketSite = {
  name: string;
  latitude: number;
  longitude: number;
  href: string;
  serialNumber: string | null;
  locationNote: string | null;
};

export const ticketSiteInclude = {
  pivot: true,
  asset: { include: { assetType: { select: { name: true, slug: true } } } },
} as const;

export function ticketSite(ticket: TicketSiteSource): TicketSite | null {
  if (ticket.pivot) {
    return {
      name: ticket.pivot.name,
      latitude: ticket.pivot.latitude,
      longitude: ticket.pivot.longitude,
      href: `/pivots/${ticket.pivot.id}`,
      serialNumber: ticket.pivot.serialNumber ?? null,
      locationNote: ticket.pivot.locationNote ?? null,
    };
  }
  if (ticket.asset) {
    const typeName = ticket.asset.assetType?.name;
    return {
      name: typeName ? `${ticket.asset.name} · ${typeName}` : ticket.asset.name,
      latitude: ticket.asset.latitude,
      longitude: ticket.asset.longitude,
      href: `/assets/${ticket.asset.id}`,
      serialNumber: ticket.asset.serialNumber ?? null,
      locationNote: ticket.asset.locationNote ?? null,
    };
  }
  return null;
}

export function ticketSiteName(ticket: TicketSiteSource) {
  return ticketSite(ticket)?.name ?? "Asset";
}
