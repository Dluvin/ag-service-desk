"use client";

import dynamic from "next/dynamic";
import type { MapPin } from "@/lib/map-pins";

const Canvas = dynamic(() => import("./AllTicketsMapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[22rem] items-center justify-center bg-stone-100 text-sm text-stone-600">
      Loading map…
    </div>
  ),
});

export function StaffPresenceMap({ pins }: { pins: MapPin[] }) {
  if (pins.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
        No phone locations yet. Staff who allow location on this device show up here after they
        open the desk.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <p className="border-b border-stone-200 px-4 py-3 text-sm font-semibold text-stone-900">
        {pins.length} staff location{pins.length === 1 ? "" : "s"}
      </p>
      <p className="border-b border-stone-200 px-4 py-2 text-xs text-stone-500">
        Blue pins are the last phone or browser location the desk received. This is not the truck
        GPS on Dispatch.
      </p>
      <Canvas pins={pins} heightClass="h-[22rem]" />
    </div>
  );
}
