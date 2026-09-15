"use client";

import { useState } from "react";
import { GoogleMapPanel } from "./GoogleMapPanel";

type Marker = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  subtitle?: string;
};

export function SelectableMap({ markers }: { markers: Marker[] }) {
  const [selectedId, setSelectedId] = useState(markers[0]?.id);
  return (
    <GoogleMapPanel
      markers={markers}
      selectedId={selectedId}
      onSelect={setSelectedId}
    />
  );
}
