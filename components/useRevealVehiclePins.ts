"use client";

import { useEffect, useState } from "react";
import type { MapPin } from "@/lib/map-pins";

export function useRevealVehiclePins(enabled = true) {
  const [vehicles, setVehicles] = useState<MapPin[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function load() {
      const res = await fetch("/api/reveal/locations", { cache: "no-store" });
      const data = (await res.json()) as {
        configured?: boolean;
        pins?: MapPin[];
        error?: string | null;
      };
      if (cancelled) return;
      setConfigured(Boolean(data.configured));
      setVehicles(data.pins ?? []);
      setError(data.error ?? null);
    }

    load();
    const timer = setInterval(load, 45_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enabled]);

  return { vehicles, configured, error };
}
