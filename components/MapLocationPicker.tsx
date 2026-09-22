"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { parseMapsLocation } from "@/lib/maps";
import { usePlan } from "./PlanProvider";

const ClickMap = dynamic(() => import("./ClickMapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 items-center justify-center bg-stone-100 text-sm text-stone-600">
      Loading map…
    </div>
  ),
});

declare global {
  interface Window {
    google?: {
      maps: {
        Map: new (el: HTMLElement, opts: object) => {
          addListener: (event: string, fn: (e: { latLng: { lat: () => number; lng: () => number } }) => void) => void;
          setCenter: (p: { lat: number; lng: number }) => void;
          setZoom: (z: number) => void;
        };
        Marker: new (opts: object) => { setPosition: (p: { lat: number; lng: number }) => void };
      };
    };
  }
}

function loadGoogle(apiKey: string) {
  const src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
  if (document.querySelector(`script[src="${src}"]`)) {
    return Promise.resolve();
  }
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(script);
  });
}

export function MapLocationPicker({
  apiKey,
  defaultLat,
  defaultLng,
}: {
  apiKey?: string;
  defaultLat?: number;
  defaultLng?: number;
}) {
  const plan = usePlan();
  const showMap = plan.mapsEnabled;
  const mapRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<{ setPosition: (p: { lat: number; lng: number }) => void } | null>(null);
  const [lat, setLat] = useState(defaultLat != null ? String(defaultLat) : "");
  const [lng, setLng] = useState(defaultLng != null ? String(defaultLng) : "");
  const [mapsLink, setMapsLink] = useState("");
  const [status, setStatus] = useState(
    showMap ? "Click the map to drop a pin." : "Paste a Google Maps link or enter coordinates.",
  );

  function apply(nextLat: number, nextLng: number) {
    setLat(nextLat.toFixed(6));
    setLng(nextLng.toFixed(6));
    setStatus(`${nextLat.toFixed(5)}, ${nextLng.toFixed(5)}`);
    markerRef.current?.setPosition({ lat: nextLat, lng: nextLng });
  }

  useEffect(() => {
    if (!showMap || !apiKey || !mapRef.current) return;
    let cancelled = false;
    loadGoogle(apiKey)
      .then(() => {
        if (cancelled || !mapRef.current || !window.google) return;
        const start = {
          lat: defaultLat ?? 40.8684,
          lng: defaultLng ?? -97.5919,
        };
        const map = new window.google.maps.Map(mapRef.current, {
          center: start,
          zoom: 8,
          mapTypeId: "hybrid",
          mapTypeControl: true,
          streetViewControl: false,
        });
        const marker = new window.google.maps.Marker({
          map,
          position: defaultLat != null && defaultLng != null ? start : undefined,
        });
        markerRef.current = marker;
        map.addListener("click", (event) => {
          apply(event.latLng.lat(), event.latLng.lng());
        });
      })
      .catch(() => setStatus("Google Maps did not load. Paste a Maps link or enter coordinates."));
    return () => {
      cancelled = true;
    };
  }, [apiKey, defaultLat, defaultLng, showMap]);

  return (
    <div className="space-y-3">
      <input type="hidden" name="latitude" value={lat} />
      <input type="hidden" name="longitude" value={lng} />
      <label className="block text-sm font-medium">
        Paste a Google Maps link
        <input
          name="mapsInput"
          value={mapsLink}
          onChange={(event) => {
            const value = event.target.value;
            setMapsLink(value);
            const parsed = parseMapsLocation(value);
            if (parsed) apply(parsed.latitude, parsed.longitude);
          }}
          placeholder="https://maps.google.com/... or 40.86, -97.59"
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        />
      </label>
      {showMap && apiKey ? (
        <div>
          <p className="mb-1 text-sm font-medium">Click the Google Map to drop a pin</p>
          <div ref={mapRef} className="h-80 w-full overflow-hidden rounded-lg border border-stone-300" />
          <p className="mt-1 text-xs text-stone-500">{status}</p>
        </div>
      ) : showMap ? (
        <div>
          <p className="mb-1 text-sm font-medium">Click the map to drop a pin</p>
          <div className="overflow-hidden rounded-lg border border-stone-300">
            <ClickMap
              lat={lat ? Number(lat) : null}
              lng={lng ? Number(lng) : null}
              onPick={apply}
            />
          </div>
          <p className="mt-1 text-xs text-stone-500">{status}</p>
        </div>
      ) : (
        <p className="text-xs text-stone-500">{status}</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium">
          Latitude
          <input
            value={lat}
            onChange={(event) => setLat(event.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm font-medium">
          Longitude
          <input
            value={lng}
            onChange={(event) => setLng(event.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
      </div>
    </div>
  );
}
