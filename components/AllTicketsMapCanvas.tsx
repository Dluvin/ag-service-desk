"use client";

import { useEffect } from "react";
import L from "leaflet";
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { MapPin } from "@/lib/map-pins";

function spreadPins(pins: MapPin[]) {
  const counts = new Map<string, number>();
  return pins.map((pin) => {
    const key = `${pin.lat.toFixed(5)},${pin.lng.toFixed(5)}`;
    const index = counts.get(key) ?? 0;
    counts.set(key, index + 1);
    if (index === 0) return pin;
    const angle = (index * Math.PI) / 3;
    const delta = 0.012;
    return {
      ...pin,
      lat: pin.lat + delta * Math.cos(angle),
      lng: pin.lng + delta * Math.sin(angle),
    };
  });
}

function FitPins({ pins }: { pins: MapPin[] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 0) return;
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 12);
      return;
    }
    map.fitBounds(
      L.latLngBounds(pins.map((pin) => [pin.lat, pin.lng])),
      { padding: [48, 48], maxZoom: 11 },
    );
  }, [map, pins]);
  return null;
}

export default function AllTicketsMapCanvas({
  pins,
  selectedId,
  heightClass = "h-[28rem]",
}: {
  pins: MapPin[];
  selectedId?: string;
  heightClass?: string;
}) {
  const spread = spreadPins(pins);
  const center: [number, number] = spread[0] ? [spread[0].lat, spread[0].lng] : [41.0, -98.0];

  return (
    <MapContainer center={center} zoom={7} className={`${heightClass} w-full`} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitPins pins={spread} />
      {spread.map((pin) => {
        const vehicle = pin.kind === "vehicle";
        const selected = selectedId === pin.id;
        const onSite = Boolean(pin.onSite);
        return (
        <CircleMarker
          key={pin.id}
          center={[pin.lat, pin.lng]}
          radius={onSite ? 10 : vehicle ? 8 : selected ? 13 : 11}
          pathOptions={
            vehicle
              ? { color: "#7f1d1d", fillColor: onSite ? "#ef4444" : "#dc2626", fillOpacity: 0.95, weight: onSite || selected ? 3 : 2 }
              : { color: onSite ? "#7f1d1d" : "#064e3b", fillColor: onSite ? "#dc2626" : "#059669", fillOpacity: 0.95, weight: selected || onSite ? 3 : 2 }
          }
        >
          {onSite ? (
            <Tooltip permanent direction="top" offset={[0, -12]} className="ag-onsite-label">
              On-site
            </Tooltip>
          ) : null}
          <Popup>
            <div className="min-w-44 text-sm">
              <p className="font-semibold text-stone-900">{pin.name}</p>
              {pin.subtitle ? <p className="mt-0.5 text-xs text-stone-600">{pin.subtitle}</p> : null}
              <p className="mt-1 text-xs text-stone-500">
                {onSite ? "On-site · time is being recorded · " : vehicle ? "Assigned Verizon truck · " : ""}
                {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {pin.href ? (
                  <a href={pin.href} className="font-medium text-emerald-800">
                    Open ticket
                  </a>
                ) : null}
                <a
                  href={`https://www.google.com/maps?q=${pin.lat},${pin.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-emerald-800"
                >
                  Google Maps
                </a>
              </div>
            </div>
          </Popup>
        </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
