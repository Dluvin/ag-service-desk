"use client";

import { MapContainer, CircleMarker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { SatelliteTiles } from "./SatelliteTiles";

function ClickCatch({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

export default function ClickMapCanvas({
  lat,
  lng,
  onPick,
}: {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number) => void;
}) {
  const center: [number, number] = lat != null && lng != null ? [lat, lng] : [40.8684, -97.5919];

  return (
    <MapContainer center={center} zoom={lat != null ? 13 : 7} className="h-80 w-full" scrollWheelZoom>
      <SatelliteTiles />
      <ClickCatch onPick={onPick} />
      {lat != null && lng != null ? (
        <CircleMarker
          center={[lat, lng]}
          radius={11}
          pathOptions={{ color: "#064e3b", fillColor: "#059669", fillOpacity: 0.95, weight: 2 }}
        />
      ) : null}
    </MapContainer>
  );
}
