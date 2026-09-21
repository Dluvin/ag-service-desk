import { prisma } from "./prisma";
import { fetchRevealLocations, loadRevealCreds } from "./reveal";
import { syncOnsiteVisits } from "./onsite";
import type { MapPin } from "./map-pins";
import { ROLES } from "./roles";
import { STORE_ALL, matchesSelectedStore, vehicleEffectiveStoreId } from "./stores";

export async function getRevealMapSnapshot(
  organizationId: string,
  selectedStore = STORE_ALL,
): Promise<{
  configured: boolean;
  pins: MapPin[];
  error: string | null;
}> {
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  const creds = await loadRevealCreds(organizationId);
  if (!org || !creds) {
    return { configured: false, pins: [], error: null };
  }

  try {
    const technicians = await prisma.user.findMany({
      where: {
        organizationId,
        role: ROLES.TECHNICIAN,
        revealVehicleNumber: { not: null },
      },
    });
    const byVehicle = new Map(
      technicians
        .filter((tech) => tech.revealVehicleNumber)
        .map((tech) => [tech.revealVehicleNumber as string, tech]),
    );

    const locations = await fetchRevealLocations(organizationId);
    const mapSettings = await prisma.revealVehicle.findMany({
      where: { organizationId, active: true },
      select: { number: true, name: true, showOnMap: true, storeId: true },
    });
    const settingsByKey = new Map<string, (typeof mapSettings)[number]>();
    for (const vehicle of mapSettings) {
      for (const key of [vehicle.number, vehicle.name].map((value) => value.trim().toLowerCase())) {
        settingsByKey.set(key, vehicle);
      }
    }
    const hidden = new Set(
      mapSettings
        .filter((vehicle) => !vehicle.showOnMap)
        .flatMap((vehicle) => [vehicle.number, vehicle.name].map((value) => value.trim().toLowerCase())),
    );
    const visibleLocations = locations.filter((location) => {
      const keys = [location.vehicleNumber, location.name].filter(Boolean).map((value) => value!.trim().toLowerCase());
      if (keys.some((key) => hidden.has(key))) return false;
      const vehicle = keys.map((key) => settingsByKey.get(key)).find(Boolean);
      const tech = byVehicle.get(location.vehicleNumber);
      return matchesSelectedStore(vehicleEffectiveStoreId(vehicle?.storeId, tech?.storeId), selectedStore);
    });
    await syncOnsiteVisits({
      organizationId,
      radiusMeters: org?.revealOnsiteMeters ?? 400,
      vehicles: locations.map((location) => ({
        vehicleNumber: location.vehicleNumber,
        lat: location.lat,
        lng: location.lng,
        technicianId: byVehicle.get(location.vehicleNumber)?.id ?? null,
      })),
    });

    const openVisits = await prisma.siteVisit.findMany({
      where: {
        endedAt: null,
        ticket: { organizationId },
      },
      include: { ticket: { select: { id: true, number: true, pivotId: true } } },
    });
    const visitByVehicle = new Map(openVisits.map((visit) => [visit.vehicleNumber, visit]));
    const now = Date.now();

    return {
      configured: true,
      pins: visibleLocations.map((location) => {
        const tech = byVehicle.get(location.vehicleNumber);
        const visit = visitByVehicle.get(location.vehicleNumber);
        const onSiteMinutes = visit
          ? Math.max(0, Math.round((now - visit.startedAt.getTime()) / 60_000))
          : 0;
        const bits = [
          tech?.name,
          location.vehicleNumber,
          visit
            ? `On-site${onSiteMinutes ? ` ${onSiteMinutes} min` : ""} · work order #${visit.ticket.number}`
            : location.displayState,
          location.address,
        ].filter(Boolean);
        return {
          id: `vehicle-${location.vehicleNumber}`,
          kind: "vehicle" as const,
          name: tech?.name ?? location.name ?? location.vehicleNumber,
          lat: location.lat,
          lng: location.lng,
          subtitle: bits.join(" · "),
          href: visit ? `/tickets/${visit.ticket.id}` : undefined,
          onSite: Boolean(visit),
          onSiteTicketId: visit?.ticket.id,
          onSitePivotId: visit?.ticket.pivotId,
        };
      }),
      error: null,
    };
  } catch (error) {
    return {
      configured: true,
      pins: [],
      error: error instanceof Error ? error.message : "Could not load Reveal locations.",
    };
  }
}
