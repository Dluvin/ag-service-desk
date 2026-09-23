"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { MapPin } from "@/lib/map-pins";
import { STORE_ALL, storeQuery } from "@/lib/stores";
import { useRevealVehiclePins } from "./useRevealVehiclePins";
import { usePlan } from "./PlanProvider";

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
  store,
  showOpenMapLink = true,
}: {
  pins: MapPin[];
  vehiclePins?: MapPin[];
  revealSetupHref?: string;
  store?: string | null;
  showOpenMapLink?: boolean;
}) {
  const plan = usePlan();
  const showMap = plan.mapsEnabled;
  const showGps = plan.gpsEnabled;
  const fetched = useRevealVehiclePins(showGps && vehiclePins === undefined, store);
  const trucks = showGps
    ? [...new Map((vehiclePins ?? fetched.vehicles).map((truck) => [truck.id, truck])).values()]
    : [];
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
        No open work orders or assigned trucks to map.
      </div>
    );
  }

  const openMapHref = `/map${store && store !== STORE_ALL ? storeQuery(store) : ""}`;

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      {showGps && fetched.configured === false && revealSetupHref ? (
        <p className="border-b border-stone-200 px-4 py-3 text-sm text-stone-600">
          GPS is not connected yet.{" "}
          <Link href={revealSetupHref} className="font-medium text-emerald-800 hover:underline">
            Open Connectors
          </Link>
          .
        </p>
      ) : null}
      {showGps && fetched.error ? (
        <p className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Reveal: {fetched.error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-4 py-3">
        <p className="text-sm font-semibold text-stone-900">
          {ticketPins.length} open work order{ticketPins.length === 1 ? "" : "s"}
          {trucks.length > 0
            ? ` · ${trucks.length} Verizon truck${trucks.length === 1 ? "" : "s"}`
            : ""}
          {onSiteCount > 0 ? ` · ${onSiteCount} on site` : ""}{" "}
          on the map
        </p>
        {showOpenMapLink ? (
          <Link href={openMapHref} className="text-sm font-medium text-emerald-800 hover:underline">
            Open work order map
          </Link>
        ) : null}
      </div>
      {showMap ? (
        <>
          <p className="border-b border-stone-200 px-4 py-2 text-xs text-stone-500">
            Green = work order at the pivot. Red = assigned Verizon truck. Flashing On-site means GPS is
            inside the pivot radius and time is being recorded. Truck pins refresh every 45 seconds.
          </p>
          <Canvas pins={all} />
        </>
      ) : (
        <p className="px-4 py-3 text-sm text-stone-600">
          In-app maps are not on this plan. Use Google Maps on a work order for directions.
        </p>
      )}
    </div>
  );
}
