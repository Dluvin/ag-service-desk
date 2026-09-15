"use client";

import dynamic from "next/dynamic";
import type { MapPin } from "@/lib/map-pins";

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
  vehiclePins = [],
}: {
  pins: MapPin[];
  vehiclePins?: MapPin[];
}) {
  const ticketPins = pins.map((pin) => ({ ...pin, kind: pin.kind ?? ("ticket" as const) }));
  const all = [...ticketPins, ...vehiclePins];

  if (all.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-6 text-stone-600">
        No open tickets or trucks to map.
      </div>
    );
  }

  const googlePins = ticketPins.length > 0 ? ticketPins : vehiclePins;
  const googleDir =
    googlePins.length === 1
      ? `https://www.google.com/maps?q=${googlePins[0].lat},${googlePins[0].lng}`
      : `https://www.google.com/maps/dir/${googlePins.map((pin) => `${pin.lat},${pin.lng}`).join("/")}`;

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-4 py-3">
        <p className="text-sm font-semibold text-stone-900">
          {ticketPins.length} open ticket{ticketPins.length === 1 ? "" : "s"}
          {vehiclePins.length > 0
            ? ` · ${vehiclePins.length} truck${vehiclePins.length === 1 ? "" : "s"}`
            : ""}{" "}
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
      <Canvas pins={all} />
    </div>
  );
}
