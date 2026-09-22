/**
 * Plan prices and entitlements live here so they can change without a schema rewrite.
 *
 * Existing companies default to SHOP. That is the current live product (in-app maps on),
 * so David’s dealers keep maps after this ships. Flip a company on /platform.
 */

export const SALES_EMAIL = "david@agdeskpro.com";
export const SALES_MAILTO = `mailto:${SALES_EMAIL}`;
export const TRIAL_DAYS = 15;

export const PLAN_IDS = ["STARTER", "SHOP", "ENTERPRISE"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const GPS_PROVIDERS = ["NONE", "REVEAL", "VERIZON", "OTHER"] as const;
export type GpsProvider = (typeof GPS_PROVIDERS)[number];

export type PlanFeature = "maps" | "gps" | "stores";

export type PlanCatalog = {
  id: PlanId;
  label: string;
  /** Base monthly price in cents. STARTER is per user. */
  monthlyCents: number;
  perUser: boolean;
  mapsEnabled: boolean;
  directionsEnabled: boolean;
  /** Hard user cap. null = unlimited (or pay-per-seat with no lock). */
  maxUsers: number | null;
  /** Seats included in monthlyCents. null = unlimited. */
  includedUsers: number | null;
  extraSeatCents: number;
  /** Hard store cap. null = unlimited. More than this = contact sales; do not auto-unlock. */
  maxStores: number | null;
  gpsEnabled: boolean;
  gpsProvider: GpsProvider;
  revealAddOnAvailable: boolean;
  revealAddOnCents: number;
};

export const PLANS: Record<PlanId, PlanCatalog> = {
  STARTER: {
    id: "STARTER",
    label: "Starter",
    monthlyCents: 1995,
    perUser: true,
    mapsEnabled: false,
    directionsEnabled: true,
    maxUsers: null,
    includedUsers: 1,
    extraSeatCents: 1995,
    maxStores: 2,
    gpsEnabled: false,
    gpsProvider: "NONE",
    revealAddOnAvailable: false,
    revealAddOnCents: 0,
  },
  SHOP: {
    id: "SHOP",
    label: "Shop",
    monthlyCents: 40000,
    perUser: false,
    mapsEnabled: true,
    directionsEnabled: true,
    maxUsers: 10,
    includedUsers: 10,
    extraSeatCents: 2995,
    maxStores: 5,
    gpsEnabled: false,
    gpsProvider: "NONE",
    revealAddOnAvailable: true,
    revealAddOnCents: 15000,
  },
  ENTERPRISE: {
    id: "ENTERPRISE",
    label: "Enterprise",
    monthlyCents: 150000,
    perUser: false,
    mapsEnabled: true,
    directionsEnabled: true,
    maxUsers: null,
    includedUsers: null,
    extraSeatCents: 0,
    maxStores: null,
    gpsEnabled: true,
    gpsProvider: "VERIZON",
    revealAddOnAvailable: false,
    revealAddOnCents: 0,
  },
};

export const DEFAULT_PLAN: PlanId = "SHOP";

export type PlanOrg = {
  plan?: string | null;
  mapsEnabled?: boolean | null;
  gpsEnabled?: boolean | null;
  gpsProvider?: string | null;
  revealGps?: boolean | null;
  maxStores?: number | null;
  includedUsers?: number | null;
  extraSeatCents?: number | null;
  monthlyCents?: number | null;
};

export const PLAN_ORG_SELECT = {
  plan: true,
  mapsEnabled: true,
  gpsEnabled: true,
  gpsProvider: true,
  revealGps: true,
  maxStores: true,
  includedUsers: true,
  extraSeatCents: true,
  monthlyCents: true,
} as const;

export type ResolvedPlan = {
  plan: PlanId;
  label: string;
  perUser: boolean;
  mapsEnabled: boolean;
  directionsEnabled: boolean;
  gpsEnabled: boolean;
  gpsProvider: GpsProvider;
  revealGps: boolean;
  revealAddOnAvailable: boolean;
  revealAddOnCents: number;
  maxStores: number | null;
  maxUsers: number | null;
  includedUsers: number | null;
  extraSeatCents: number;
  monthlyCents: number;
};

export function isPlanId(value: string | null | undefined): value is PlanId {
  return PLAN_IDS.includes(value as PlanId);
}

export function isGpsProvider(value: string | null | undefined): value is GpsProvider {
  return GPS_PROVIDERS.includes(value as GpsProvider);
}

export function planCatalog(plan?: string | null): PlanCatalog {
  return isPlanId(plan) ? PLANS[plan] : PLANS[DEFAULT_PLAN];
}

export function formatPlanCents(cents: number) {
  const dollars = cents / 100;
  return dollars % 1 === 0
    ? `$${dollars.toLocaleString("en-US")}`
    : `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function resolveEntitlements(org: PlanOrg | null | undefined): ResolvedPlan {
  const catalog = planCatalog(org?.plan);
  const revealGps = Boolean(org?.revealGps) && catalog.revealAddOnAvailable;
  const mapsEnabled = org?.mapsEnabled ?? catalog.mapsEnabled;
  const gpsEnabled = Boolean(org?.gpsEnabled) || catalog.gpsEnabled || revealGps;

  let gpsProvider: GpsProvider = isGpsProvider(org?.gpsProvider) ? org.gpsProvider : catalog.gpsProvider;
  if (!gpsEnabled) gpsProvider = "NONE";
  else if (gpsProvider === "NONE") gpsProvider = catalog.gpsProvider === "NONE" ? "VERIZON" : catalog.gpsProvider;

  const includedUsers = org?.includedUsers ?? catalog.includedUsers;
  const maxUsers = catalog.maxUsers == null ? null : (org?.includedUsers ?? catalog.maxUsers);
  const maxStores = org?.maxStores ?? catalog.maxStores;

  return {
    plan: catalog.id,
    label: catalog.label,
    perUser: catalog.perUser,
    mapsEnabled,
    directionsEnabled: catalog.directionsEnabled,
    gpsEnabled,
    gpsProvider,
    revealGps,
    revealAddOnAvailable: catalog.revealAddOnAvailable,
    revealAddOnCents: catalog.revealAddOnCents,
    maxStores,
    maxUsers,
    includedUsers,
    extraSeatCents: org?.extraSeatCents ?? catalog.extraSeatCents,
    monthlyCents: org?.monthlyCents ?? catalog.monthlyCents,
  };
}

export function planAllows(org: PlanOrg | null | undefined, feature: PlanFeature) {
  const entitlements = resolveEntitlements(org);
  if (feature === "maps") return entitlements.mapsEnabled;
  if (feature === "gps") return entitlements.gpsEnabled;
  return entitlements.maxStores == null || entitlements.maxStores > 0;
}

export function showInAppMap(org: PlanOrg | null | undefined) {
  return planAllows(org, "maps");
}

export function showVehicleGps(org: PlanOrg | null | undefined) {
  return planAllows(org, "gps");
}

export function canAddStore(org: PlanOrg | null | undefined, currentCount: number, adding = 1) {
  const max = resolveEntitlements(org).maxStores;
  if (max == null) return true;
  return currentCount + adding <= max;
}

export function canAddUser(org: PlanOrg | null | undefined, currentCount: number, adding = 1) {
  const max = resolveEntitlements(org).maxUsers;
  if (max == null) return true;
  return currentCount + adding <= max;
}

export function remainingUserSlots(org: PlanOrg | null | undefined, currentCount: number) {
  const max = resolveEntitlements(org).maxUsers;
  if (max == null) return null;
  return Math.max(0, max - currentCount);
}

export function extraStaffSeatsFor(org: PlanOrg | null | undefined, staffCount: number) {
  const included = resolveEntitlements(org).includedUsers;
  if (included == null) return 0;
  return Math.max(0, staffCount - included);
}

export function contactSalesLabel() {
  return `Contact sales at ${SALES_EMAIL}`;
}

export function contactSalesStoreMessage(org: PlanOrg | null | undefined) {
  const { maxStores, label } = resolveEntitlements(org);
  if (maxStores == null) return `Unlimited stores are included. ${contactSalesLabel()} if you need help.`;
  return `The ${label} plan includes ${maxStores} store${maxStores === 1 ? "" : "s"}. ${contactSalesLabel()} to add more.`;
}

export function contactSalesUserMessage(org: PlanOrg | null | undefined) {
  const { maxUsers, includedUsers, extraSeatCents, label, perUser } = resolveEntitlements(org);
  if (maxUsers == null) {
    if (perUser) {
      return `Each extra staff login is ${formatPlanCents(extraSeatCents)}/month. ${contactSalesLabel()} to update billing.`;
    }
    return `Staff seats are unlimited on this plan. ${contactSalesLabel()} if you need help.`;
  }
  const extra =
    extraSeatCents > 0 ? ` Extra seats are ${formatPlanCents(extraSeatCents)}/month.` : "";
  return `The ${label} plan includes ${includedUsers ?? maxUsers} staff logins.${extra} ${contactSalesLabel()} to add more.`;
}

export function contactSalesGpsMessage(org: PlanOrg | null | undefined) {
  const entitlements = resolveEntitlements(org);
  if (entitlements.revealAddOnAvailable) {
    return `Live vehicle GPS is a ${formatPlanCents(entitlements.revealAddOnCents)}/month add-on on Shop, or included on Enterprise. ${contactSalesLabel()} to turn it on.`;
  }
  if (entitlements.plan === "STARTER") {
    return `Live vehicle GPS is not on Starter. ${contactSalesLabel()} about Shop or Enterprise.`;
  }
  return `Live vehicle GPS is included on Enterprise. Other GPS providers can be set by platform (no development fee). ${contactSalesLabel()} to change providers.`;
}

export type LandingPlanFeature = {
  label: string;
  included: boolean;
  optional?: boolean;
};

export type LandingPlanTile = {
  id: PlanId;
  name: string;
  price: string;
  priceNote: string;
  description: string;
  featured?: boolean;
  features: LandingPlanFeature[];
};

/** Homepage tiles. Copy is derived from PLANS so prices stay in one file. */
export function landingPlanTiles(): LandingPlanTile[] {
  const starter = PLANS.STARTER;
  const shop = PLANS.SHOP;
  const enterprise = PLANS.ENTERPRISE;
  return [
    {
      id: "STARTER",
      name: starter.label,
      price: formatPlanCents(starter.monthlyCents),
      priceNote: "per user / month",
      description:
        "Full work-order desk for a small shop. Open in Google Maps stays on. In-app satellite maps stay off.",
      features: [
        { label: "Full desk: work orders, customers, and farms", included: true },
        { label: "Open in Google Maps and outbound directions", included: true },
        { label: "1–2 stores", included: true },
        { label: "In-app satellite maps", included: false },
        { label: "Live vehicle GPS / Reveal", included: false },
      ],
    },
    {
      id: "SHOP",
      name: shop.label,
      price: formatPlanCents(shop.monthlyCents),
      priceNote: `per month · ${shop.includedUsers} users included`,
      description: `In-app maps for dispatch and the field. Extra seats ${formatPlanCents(shop.extraSeatCents)}/user/month. More than ${shop.maxStores} stores: contact sales.`,
      featured: true,
      features: [
        { label: "Full desk: work orders, customers, and farms", included: true },
        { label: "In-app satellite maps", included: true },
        { label: `${shop.includedUsers} users included`, included: true },
        { label: `Extra seats ${formatPlanCents(shop.extraSeatCents)}/user/month`, included: true },
        { label: `Up to ${shop.maxStores} stores`, included: true },
        {
          label: `Reveal GPS add-on ${formatPlanCents(shop.revealAddOnCents)}/month`,
          included: false,
          optional: true,
        },
        { label: "Unlimited users and stores", included: false },
        { label: "Live GPS included", included: false },
      ],
    },
    {
      id: "ENTERPRISE",
      name: enterprise.label,
      price: formatPlanCents(enterprise.monthlyCents),
      priceNote: "per month · unlimited users",
      description:
        "Unlimited seats and stores. Verizon GPS is included. Other GPS: contact sales, no setup fee.",
      features: [
        { label: "Full desk: work orders, customers, and farms", included: true },
        { label: "In-app satellite maps", included: true },
        { label: "Unlimited users", included: true },
        { label: "Unlimited stores", included: true },
        { label: "Verizon GPS included", included: true },
        { label: "Other GPS: contact sales, no setup fee", included: true },
      ],
    },
  ];
}

export function orgFieldsForPlan(input: {
  plan: PlanId;
  revealGps?: boolean;
  gpsProvider?: GpsProvider;
  maxStoresOverride?: number | null;
  includedUsersOverride?: number | null;
  mapsOverride?: boolean | null;
}) {
  const catalog = PLANS[input.plan];
  const revealGps = Boolean(input.revealGps) && catalog.revealAddOnAvailable;
  const gpsEnabled = catalog.gpsEnabled || revealGps;
  let gpsProvider: GpsProvider = input.gpsProvider ?? catalog.gpsProvider;
  if (!gpsEnabled) {
    gpsProvider = "NONE";
  } else if (input.plan === "ENTERPRISE" && gpsProvider === "NONE") {
    gpsProvider = "VERIZON";
  } else if (revealGps && gpsProvider === "NONE") {
    gpsProvider = "VERIZON";
  }

  return {
    plan: input.plan,
    mapsEnabled: input.mapsOverride ?? null,
    gpsEnabled,
    gpsProvider,
    revealGps,
    maxStores: input.maxStoresOverride ?? null,
    includedUsers: input.includedUsersOverride ?? null,
    extraSeatCents: null as number | null,
    monthlyCents: null as number | null,
  };
}
