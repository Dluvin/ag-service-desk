"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { MapPin } from "@/lib/map-pins";
import { useRevealVehiclePins } from "./useRevealVehiclePins";

const Canvas = dynamic(() => import("./AllTicketsMapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[28rem] items-center justify-center bg-stone-100 text-sm text-stone-600">
      Loading map…
    </div>
  ),
});

export function AllTicketsMap({
  pins,
  vehiclePins,
  revealSetupHref,
}: {
  pins: MapPin[];
  vehiclePins?: MapPin[];
  revealSetupHref?: string;
}) {
  const fetched = useRevealVehiclePins(vehiclePins === undefined);
  const trucks = [...new Map((vehiclePins ?? fetched.vehicles).map((truck) => [truck.id, truck])).values()];
  const onSiteTickets = new Set(
    trucks.map((truck) => truck.onSiteTicketId).filter((id): id is string => Boolean(id)),
  );
  const onSiteCount = trucks.filter((truck) => truck.onSite).length;
  const ticketPins = pins.map((pin) => ({
    ...pin,
    kind: pin.kind ?? ("ticket" as const),
    onSite: pin.onSite || onSiteTickets.has(pin.id),
  }));
  const all = [...ticketPins, ...trucks];

  if (all.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-6 text-stone-600">
        No open tickets or assigned trucks to map.
      </div>
    );
  }

  const googlePins = ticketPins.length > 0 ? ticketPins : trucks;
  const googleDir =
    googlePins.length === 1
      ? `https://www.google.com/maps?q=${googlePins[0].lat},${googlePins[0].lng}`
      : `https://www.google.com/maps/dir/${googlePins.map((pin) => `${pin.lat},${pin.lng}`).join("/")}`;

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      {fetched.configured === false && revealSetupHref ? (
        <p className="border-b border-stone-200 px-4 py-3 text-sm text-stone-600">
          Verizon Connect Reveal is not connected yet.{" "}
          <Link href={revealSetupHref} className="font-medium text-emerald-800 hover:underline">
            Add your developer login
          </Link>
          .
        </p>
      ) : null}
      {fetched.error ? (
        <p className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Reveal: {fetched.error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-4 py-3">
        <p className="text-sm font-semibold text-stone-900">
          {ticketPins.length} open ticket{ticketPins.length === 1 ? "" : "s"}
          {trucks.length > 0
            ? ` · ${trucks.length} Verizon truck${trucks.length === 1 ? "" : "s"}`
            : ""}
          {onSiteCount > 0 ? ` · ${onSiteCount} on site` : ""}{" "}
          on the map
        </p>
        <a
          href={googleDir}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-emerald-800 hover:underline"
        >
          Open tickets in Google Maps
        </a>
      </div>
      <p className="border-b border-stone-200 px-4 py-2 text-xs text-stone-500">
        Green = ticket at the pivot. Red = assigned Verizon truck. Flashing On-site means GPS is
        inside the pivot radius and time is being recorded. Truck pins refresh every 45 seconds.
      </p>
      <Canvas pins={all} />
    </div>
  );
}
