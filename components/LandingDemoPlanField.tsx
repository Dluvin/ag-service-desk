"use client";

import { useEffect, useState } from "react";
import { isPlanId, PLAN_IDS, PLANS, type PlanId } from "@/lib/plans";

function planFromValue(value: string | null | undefined): PlanId | "" {
  const upper = String(value ?? "").trim().toUpperCase();
  return isPlanId(upper) ? upper : "";
}

function planFromLocation() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = planFromValue(params.get("plan"));
  if (fromQuery) return fromQuery;

  const raw = window.location.hash.replace(/^#/, "");
  const hashParams = new URLSearchParams(raw);
  const fromHashKey = planFromValue(hashParams.get("plan"));
  if (fromHashKey) return fromHashKey;

  return planFromValue(raw);
}

export function LandingDemoPlanField({ initialPlan = "" }: { initialPlan?: PlanId | "" }) {
  const [plan, setPlan] = useState<PlanId | "">(initialPlan);

  useEffect(() => {
    const fromUrl = planFromLocation();
    if (fromUrl) setPlan(fromUrl);
  }, []);

  return (
    <fieldset className="landing-field">
      <legend>Which version?</legend>
      <div className="landing-plan-picks" role="radiogroup" aria-required="true">
        {PLAN_IDS.map((id) => (
          <label
            key={id}
            className={`landing-plan-pick${plan === id ? " landing-plan-pick-on" : ""}`}
          >
            <input
              type="radio"
              name="plan"
              value={id}
              required
              checked={plan === id}
              onChange={() => setPlan(id)}
            />
            <span>{PLANS[id].label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
