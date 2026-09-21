"use client";

import { AllTicketsMap } from "@/components/AllTicketsMap";
import type { MapPin } from "@/lib/map-pins";

export function DispatchFleetMap({
  ticketPins,
  canConfigure,
  store,
}: {
  ticketPins: MapPin[];
  canConfigure: boolean;
  store?: string | null;
}) {
  return (
    <AllTicketsMap pins={ticketPins} revealSetupHref={canConfigure ? "/reveal" : undefined} store={store} />
  );
}
