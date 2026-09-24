"use client";

import dynamic from "next/dynamic";
import type { MapPin } from "@/lib/map-pins";
import { googleMapsPlaceUrl } from "@/lib/maps";
import { useRevealVehiclePins } from "./useRevealVehiclePins";
import { usePlan } from "./PlanProvider";
import { useT } from "./I18nProvider";

function MapLoading() {
  const t = useT();
  return (
    <div className="flex h-80 items-center justify-center bg-stone-100 text-sm text-stone-600">
      {t("map.loading")}
    </div>
  );
}

const Canvas = dynamic(() => import("./AllTicketsMapCanvas"), {
  ssr: false,
  loading: () => <MapLoading />,
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
  store,
}: {
  markers: Marker[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  store?: string | null;
}) {
  const t = useT();
  const plan = usePlan();
  const { vehicles } = useRevealVehiclePins(plan.gpsEnabled, store);
  const trucks = plan.gpsEnabled ? vehicles : [];
  const onSitePivots = new Set(
    trucks.map((truck) => truck.onSitePivotId).filter((id): id is string => Boolean(id)),
  );
  const placePins: MapPin[] = markers.map((marker) => ({
    ...marker,
    kind: "place",
    onSite: onSitePivots.has(marker.id),
  }));
  const all = [...placePins, ...trucks];
  const active = markers.find((m) => m.id === selectedId) ?? markers[0];

  if (all.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-6 text-stone-600">
        {t("map.noPivots")}
      </div>
    );
  }

  const focus = active ?? trucks[0];
  const open = googleMapsPlaceUrl(focus.lat, focus.lng);

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-stone-900">{active?.name ?? t("map.assignedTrucks")}</p>
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
          {t("ticket.maps")}
        </a>
      </div>
      {plan.mapsEnabled ? (
        <>
          <p className="border-b border-stone-200 px-4 py-2 text-xs text-stone-500">
            {t("map.pivotLegend")}
          </p>
          <Canvas pins={all} selectedId={active?.id} heightClass="h-80" />
        </>
      ) : (
        <p className="px-4 py-3 text-sm text-stone-600">
          {t("map.planOffOpen")}
        </p>
      )}
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
