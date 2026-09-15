"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AllTicketsMap } from "@/components/AllTicketsMap";
import type { MapPin } from "@/lib/map-pins";

export function DispatchFleetMap({
  ticketPins,
  canConfigure,
}: {
  ticketPins: MapPin[];
  canConfigure: boolean;
}) {
  const [vehicles, setVehicles] = useState<MapPin[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

  return (
    <div>
      {configured === false ? (
        <p className="mb-3 text-sm text-stone-600">
          Verizon Connect Reveal is not connected yet.
          {canConfigure ? (
            <>
              {" "}
              <Link href="/reveal" className="font-medium text-emerald-800 hover:underline">
                Add your developer login
              </Link>
              .
            </>
          ) : (
            " Ask an admin to add the Reveal integration login."
          )}
        </p>
      ) : null}
      {error ? (
        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Reveal: {error}
        </p>
      ) : null}
      {configured && !error ? (
        <p className="mb-3 text-sm text-stone-600">
          {vehicles.length} Reveal truck{vehicles.length === 1 ? "" : "s"} on the map. Pins refresh
          every 45 seconds. Green = ticket at the pivot. Amber = vehicle GPS.
        </p>
      ) : null}
      <AllTicketsMap pins={ticketPins} vehiclePins={vehicles} />
    </div>
  );
}
