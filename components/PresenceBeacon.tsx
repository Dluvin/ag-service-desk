"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

async function readLocation(): Promise<{ latitude?: number; longitude?: number }> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return {};
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        maximumAge: 60_000,
        timeout: 8_000,
      });
    });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch {
    return {};
  }
}

export function PresenceBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    async function ping() {
      const coords = await readLocation();
      if (cancelled) return;
      await fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathname, ...coords }),
        keepalive: true,
      }).catch(() => undefined);
    }

    void ping();
    const timer = window.setInterval(() => void ping(), 45_000);
    function onVisible() {
      if (document.visibilityState === "visible") void ping();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pathname]);

  return null;
}
