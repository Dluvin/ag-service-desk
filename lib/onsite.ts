import { prisma } from "./prisma";
import { metersBetween } from "./geo";
import { OPEN_TICKET_STATUSES } from "./roles";

const MIN_VISIT_MS = 2 * 60 * 1000;

export type VehicleFix = {
  vehicleNumber: string;
  lat: number;
  lng: number;
  technicianId?: string | null;
};

export function formatDuration(ms: number) {
  const totalMinutes = Math.max(0, Math.round(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return `${hours}h ${minutes}m`;
}

export function visitMinutes(
  visits: { startedAt: Date; endedAt: Date | null }[],
  now = new Date(),
) {
  const ms = visits.reduce((sum, visit) => {
    const end = visit.endedAt ?? now;
    const duration = end.getTime() - visit.startedAt.getTime();
    if (duration < MIN_VISIT_MS && visit.endedAt) return sum;
    return sum + Math.max(0, duration);
  }, 0);
  return Math.round(ms / 60_000);
}

export async function closeOpenSiteVisits(ticketId: string) {
  await prisma.siteVisit.updateMany({
    where: { ticketId, endedAt: null },
    data: { endedAt: new Date() },
  });
}

export async function syncOnsiteVisits(args: {
  organizationId: string;
  radiusMeters: number;
  vehicles: VehicleFix[];
}) {
  const now = new Date();
  const tickets = await prisma.ticket.findMany({
    where: {
      organizationId: args.organizationId,
      status: { in: [...OPEN_TICKET_STATUSES] },
    },
    include: { pivot: true, asset: true },
  });

  const openVisits = await prisma.siteVisit.findMany({
    where: {
      endedAt: null,
      ticket: { organizationId: args.organizationId },
    },
  });

  const stillOnsite = new Set<string>();

  for (const vehicle of args.vehicles) {
    if (vehicle.lat == null || vehicle.lng == null) continue;

    const nearby = tickets
      .flatMap((ticket) => {
        const lat = ticket.pivot?.latitude ?? ticket.asset?.latitude;
        const lng = ticket.pivot?.longitude ?? ticket.asset?.longitude;
        if (lat == null || lng == null) return [];
        return [
          {
            ticket,
            meters: metersBetween(vehicle.lat, vehicle.lng, lat, lng),
          },
        ];
      })
      .filter((item) => item.meters <= args.radiusMeters)
      .sort((a, b) => a.meters - b.meters);

    const match = nearby.find((item) => {
      if (vehicle.technicianId && item.ticket.technicianId) {
        return item.ticket.technicianId === vehicle.technicianId;
      }
      if (vehicle.technicianId) {
        return !item.ticket.technicianId || item.ticket.technicianId === vehicle.technicianId;
      }
      return true;
    }) ?? nearby[0];

    if (!match) continue;

    const existing = openVisits.find(
      (visit) =>
        visit.ticketId === match.ticket.id &&
        (visit.vehicleNumber === vehicle.vehicleNumber ||
          (vehicle.technicianId != null && visit.technicianId === vehicle.technicianId)),
    );

    if (existing) {
      stillOnsite.add(existing.id);
      await prisma.siteVisit.update({
        where: { id: existing.id },
        data: {
          lastSeenAt: now,
          metersFromPivot: match.meters,
          vehicleNumber: vehicle.vehicleNumber,
        },
      });
    } else {
      const created = await prisma.siteVisit.create({
        data: {
          ticketId: match.ticket.id,
          technicianId: vehicle.technicianId ?? match.ticket.technicianId,
          vehicleNumber: vehicle.vehicleNumber,
          startedAt: now,
          lastSeenAt: now,
          metersFromPivot: match.meters,
        },
      });
      stillOnsite.add(created.id);
    }
  }

  const stale = openVisits.filter((visit) => !stillOnsite.has(visit.id));
  if (stale.length > 0) {
    await prisma.siteVisit.updateMany({
      where: { id: { in: stale.map((visit) => visit.id) } },
      data: { endedAt: now },
    });
  }
}
