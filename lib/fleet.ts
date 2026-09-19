import { prisma } from "./prisma";
import { fetchRevealLocations, loadRevealCreds } from "./reveal";
import { syncOnsiteVisits } from "./onsite";
import type { MapPin } from "./map-pins";
import { ROLES } from "./roles";

export async function getRevealMapSnapshot(organizationId: string): Promise<{
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

    const assignedNumbers = [...byVehicle.keys()];
    if (assignedNumbers.length === 0) {
      return { configured: true, pins: [], error: null };
    }

    const locations = await fetchRevealLocations(organizationId, assignedNumbers);
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

    return {
      configured: true,
      pins: locations
        .filter((location) => byVehicle.has(location.vehicleNumber))
        .map((location) => {
          const tech = byVehicle.get(location.vehicleNumber);
          const bits = [
            tech?.name,
            location.vehicleNumber,
            location.displayState,
            location.address,
          ].filter(Boolean);
          return {
            id: `vehicle-${location.vehicleNumber}`,
            kind: "vehicle" as const,
            name: tech?.name ?? location.name ?? location.vehicleNumber,
            lat: location.lat,
            lng: location.lng,
            subtitle: bits.join(" · "),
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
