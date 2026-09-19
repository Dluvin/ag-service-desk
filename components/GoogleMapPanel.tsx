"use client";

import dynamic from "next/dynamic";
import type { MapPin } from "@/lib/map-pins";
import { useRevealVehiclePins } from "./useRevealVehiclePins";

const Canvas = dynamic(() => import("./AllTicketsMapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 items-center justify-center bg-stone-100 text-sm text-stone-600">
      Loading map…
    </div>
  ),
});

type Marker = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  subtitle?: string;
};

export function GoogleMapPanel({
  markers,
  selectedId,
  onSelect,
}: {
  markers: Marker[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  const { vehicles } = useRevealVehiclePins();
  const onSitePivots = new Set(
    vehicles.map((truck) => truck.onSitePivotId).filter((id): id is string => Boolean(id)),
  );
  const placePins: MapPin[] = markers.map((marker) => ({
    ...marker,
    kind: "place",
    onSite: onSitePivots.has(marker.id),
  }));
  const all = [...placePins, ...vehicles];
  const active = markers.find((m) => m.id === selectedId) ?? markers[0];

  if (all.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-6 text-stone-600">
        No pivot locations yet.
      </div>
    );
  }

  const focus = active ?? vehicles[0];
  const open = `https://www.google.com/maps?q=${focus.lat},${focus.lng}`;

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-stone-900">{active?.name ?? "Assigned trucks"}</p>
          <p className="text-xs text-stone-500">
            {focus.lat.toFixed(5)}, {focus.lng.toFixed(5)}
            {active?.subtitle ? ` · ${active.subtitle}` : ""}
          </p>
        </div>
        <a
          href={open}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-emerald-800 hover:underline"
        >
          Open in Google Maps
        </a>
      </div>
      <p className="border-b border-stone-200 px-4 py-2 text-xs text-stone-500">
        Green = pivot. Red = assigned Verizon truck. Flashing On-site means GPS time is being recorded.
      </p>
      <Canvas pins={all} selectedId={active?.id} heightClass="h-80" />
      {markers.length > 1 ? (
        <ul className="max-h-48 divide-y divide-stone-100 overflow-auto">
          {markers.map((marker) => (
            <li key={marker.id}>
              <button
                type="button"
                onClick={() => onSelect?.(marker.id)}
                className={`flex w-full items-start justify-between gap-3 px-4 py-2 text-left text-sm ${
                  marker.id === active?.id ? "bg-emerald-50" : "hover:bg-stone-50"
                }`}
              >
                <span className="font-medium text-stone-800">{marker.name}</span>
                <span className="text-xs text-stone-500">{marker.subtitle}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
