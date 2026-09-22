"use client";

import { createContext, useContext } from "react";
import { resolveEntitlements, type ResolvedPlan } from "@/lib/plans";

const defaultPlan = resolveEntitlements({ plan: "SHOP" });

const PlanContext = createContext<ResolvedPlan>(defaultPlan);

export function PlanProvider({
  value,
  children,
}: {
  value: ResolvedPlan;
  children: React.ReactNode;
}) {
  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan() {
  return useContext(PlanContext);
}
