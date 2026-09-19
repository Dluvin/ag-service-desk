"use client";

import { AllTicketsMap } from "@/components/AllTicketsMap";
import type { MapPin } from "@/lib/map-pins";

export function DispatchFleetMap({
  ticketPins,
  canConfigure,
}: {
  ticketPins: MapPin[];
  canConfigure: boolean;
}) {
  return (
    <AllTicketsMap pins={ticketPins} revealSetupHref={canConfigure ? "/reveal" : undefined} />
  );
}
