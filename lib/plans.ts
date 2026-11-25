/**
 * Plan prices and entitlements live here so they can change without a schema rewrite.
 *
 * Existing companies default to SHOP. That is the current live product (in-app maps on),
 * so David’s dealers keep maps after this ships. Flip a company on /platform.
 */

import { FREE_HELPERS_PER_LEAD } from "./staff-seats";

/** One-time fee for Ag Desk Pro to set up the dealership's Bird SMS account. Bird's own charges are separate. */
export const SMS_SETUP_CENTS = 40000;

export const SMS_SETUP_STATUSES = ["NONE", "DUE", "PAID", "WAIVED"] as const;
export type SmsSetupStatus = (typeof SMS_SETUP_STATUSES)[number];

export function isSmsSetupStatus(value: string | null | undefined): value is SmsSetupStatus {
  return SMS_SETUP_STATUSES.includes(value as SmsSetupStatus);
}

export function smsSetupStatusLabel(status: string | null | undefined) {
  switch (status) {
    case "DUE":
      return `Fee due (${formatPlanCents(SMS_SETUP_CENTS)})`;
    case "PAID":
      return "Paid";
    case "WAIVED":
      return "Waived";
    default:
      return "Not started";
  }
}

function smsSetupFeature(): LandingPlanFeature {
  return {
    label: `SMS setup ${formatPlanCents(SMS_SETUP_CENTS)} one time`,
    included: false,
    optional: true,
  };
}

function leadHelperSeatFeature(): LandingPlanFeature {
  return {
    label: `Lead Technicians + ${FREE_HELPERS_PER_LEAD} free Staff Technicians each`,
    included: true,
  };
}

export const SALES_EMAIL = "david@agdeskpro.com";
export const SALES_MAILTO = `mailto:${SALES_EMAIL}`;
export const TRIAL_DAYS = 15;

export const PLAN_IDS = ["STARTER", "SHOP", "ENTERPRISE"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const GPS_PROVIDERS = ["NONE", "REVEAL", "VERIZON", "OTHER"] as const;
export type GpsProvider = (typeof GPS_PROVIDERS)[number];

export type PlanFeature = "maps" | "gps" | "stores" | "ocr" | "forms" | "qbwc" | "inspections" | "qbCustomers";

export type PlanCatalog = {
  id: PlanId;
  label: string;
  /** Base monthly price in cents. STARTER is per user. */
  monthlyCents: number;
  perUser: boolean;
  mapsEnabled: boolean;
  ocrEnabled: boolean;
  formsEnabled: boolean;
  qbwcEnabled: boolean;
  inspectionsEnabled: boolean;
  qbCustomerListEnabled: boolean;
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
    ocrEnabled: false,
    formsEnabled: false,
    qbwcEnabled: false,
    inspectionsEnabled: false,
    qbCustomerListEnabled: false,
    directionsEnabled: true,
    maxUsers: null,
    includedUsers: 1,
    extraSeatCents: 1995,
    maxStores: 1,
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
    ocrEnabled: false,
    formsEnabled: false,
    qbwcEnabled: false,
    inspectionsEnabled: false,
    qbCustomerListEnabled: false,
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
    ocrEnabled: true,
    formsEnabled: true,
    qbwcEnabled: true,
    inspectionsEnabled: true,
    qbCustomerListEnabled: false,
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
  ocrEnabled?: boolean | null;
  formsEnabled?: boolean | null;
  qbwcEnabled?: boolean | null;
  inspectionsEnabled?: boolean | null;
  qbCustomerListEnabled?: boolean | null;
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
  ocrEnabled: boolean;
  formsEnabled: boolean;
  qbwcEnabled: boolean;
  inspectionsEnabled: boolean;
  qbCustomerListEnabled: boolean;
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
  const ocrEnabled = org?.ocrEnabled ?? catalog.ocrEnabled;
  const formsEnabled = org?.formsEnabled ?? catalog.formsEnabled;
  const qbwcEnabled = org?.qbwcEnabled ?? catalog.qbwcEnabled;
  const inspectionsEnabled = org?.inspectionsEnabled ?? catalog.inspectionsEnabled;
  const qbCustomerListEnabled = org?.qbCustomerListEnabled ?? catalog.qbCustomerListEnabled;
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
    ocrEnabled,
    formsEnabled,
    qbwcEnabled,
    inspectionsEnabled,
    qbCustomerListEnabled,
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
  if (feature === "ocr") return entitlements.ocrEnabled;
  if (feature === "forms") return entitlements.formsEnabled;
  if (feature === "qbwc") return entitlements.qbwcEnabled;
  if (feature === "inspections") return entitlements.inspectionsEnabled;
  if (feature === "qbCustomers") return entitlements.qbCustomerListEnabled;
  if (feature === "gps") return entitlements.gpsEnabled;
  return entitlements.maxStores == null || entitlements.maxStores > 0;
}

export function showInAppMap(org: PlanOrg | null | undefined) {
  return planAllows(org, "maps");
}

export function showVehicleGps(org: PlanOrg | null | undefined) {
  return planAllows(org, "gps");
}

export function showHandwrittenOcr(org: PlanOrg | null | undefined) {
  return planAllows(org, "ocr");
}

export function showOfficeForms(org: PlanOrg | null | undefined) {
  return planAllows(org, "forms");
}

export function showQuickBooksDesktop(org: PlanOrg | null | undefined) {
  return planAllows(org, "qbwc");
}

export function showPivotInspections(org: PlanOrg | null | undefined) {
  return planAllows(org, "inspections");
}

export function showQbCustomerList(org: PlanOrg | null | undefined) {
  return planAllows(org, "qbCustomers");
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

/** Prefer billable seat count (helpers free with leads) when available. */
export function extraBillableStaffSeatsFor(org: PlanOrg | null | undefined, billableCount: number) {
  return extraStaffSeatsFor(org, billableCount);
}

export type LockedPlanNote = {
  id: string;
  title: string;
  why: string;
};

/** Features this company does not have, with a one-line reason. Empty when the plan includes them. */
export function lockedPlanNotes(org: PlanOrg | null | undefined): LockedPlanNote[] {
  const entitlements = resolveEntitlements(org);
  const notes: LockedPlanNote[] = [];
  if (!entitlements.mapsEnabled) {
    notes.push({
      id: "maps",
      title: "In-app maps",
      why: "Directions stay in Google Maps. The satellite map inside the app is on Shop and Enterprise.",
    });
  }
  if (!entitlements.gpsEnabled) {
    notes.push({
      id: "gps",
      title: "Live truck GPS",
      why:
        entitlements.plan === "STARTER"
          ? "Not included on Starter. Shop can add Reveal. Enterprise includes Verizon GPS."
          : "A Shop add-on, or included on Enterprise.",
    });
  }
  if (!entitlements.formsEnabled) {
    notes.push({
      id: "forms",
      title: "Office forms",
      why: "Included on Enterprise.",
    });
  }
  if (!entitlements.inspectionsEnabled) {
    notes.push({
      id: "inspections",
      title: "Pivot inspections",
      why: "Included on Enterprise. Seasonal maintenance stays on this plan.",
    });
  }
  if (!entitlements.ocrEnabled) {
    notes.push({
      id: "ocr",
      title: "Handwritten scans",
      why: "Scanning a paper work order into a ticket is included on Enterprise.",
    });
  }
  if (!entitlements.qbwcEnabled) {
    notes.push({
      id: "qb",
      title: "QuickBooks Desktop",
      why: "Sending estimates to QuickBooks Desktop is included on Enterprise.",
    });
  }
  return notes;
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
  const helperNote =
    " Each Lead Technician includes 3 Staff Technicians free. Staff Technicians can only be helpers on a work order that already has a Lead Technician.";
  if (maxUsers == null) {
    if (perUser) {
      return `Each extra billable staff login is ${formatPlanCents(extraSeatCents)}/month.${helperNote} ${contactSalesLabel()} to update billing.`;
    }
    return `Staff seats are unlimited on this plan.${helperNote} ${contactSalesLabel()} if you need help.`;
  }
  const extra =
    extraSeatCents > 0 ? ` Extra billable seats are ${formatPlanCents(extraSeatCents)}/month.` : "";
  return `The ${label} plan includes ${includedUsers ?? maxUsers} billable staff logins.${extra}${helperNote} ${contactSalesLabel()} to add more.`;
}

export function contactSalesQbwcMessage(org: PlanOrg | null | undefined) {
  const { label, qbwcEnabled } = resolveEntitlements(org);
  if (qbwcEnabled) {
    return `QuickBooks Desktop estimates are on for this company. Set them up under Settings → Connectors.`;
  }
  return `QuickBooks Desktop estimates (Web Connector) are included on Enterprise, and can be turned on per dealer from platform. They are off on ${label} by default. ${contactSalesLabel()} to add them.`;
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
      priceNote: "per billable user / month",
      description:
        "Full work-order desk for a small shop. Open in Google Maps stays on. In-app satellite maps stay off. Platform can unlock Enterprise add-ons when you need them.",
      features: [
        { label: "Full desk: work orders, customers, farms, and sales packages", included: true },
        leadHelperSeatFeature(),
        { label: "Multi-helper crews on every work order", included: true },
        { label: "Open in Google Maps and outbound directions", included: true },
        { label: "1 store", included: true },
        { label: "In-app satellite maps", included: false },
        { label: "Live vehicle GPS / Reveal", included: false },
        { label: "Handwritten scans, office forms, pivot inspections", included: false },
        { label: "QuickBooks Desktop estimates", included: false },
        smsSetupFeature(),
      ],
    },
    {
      id: "SHOP",
      name: shop.label,
      price: formatPlanCents(shop.monthlyCents),
      priceNote: `per month · ${shop.includedUsers} billable users included`,
      description: `In-app maps for dispatch and the field. Extra billable seats ${formatPlanCents(shop.extraSeatCents)}/user/month. More than ${shop.maxStores} stores: contact sales. Platform can enable Enterprise features per dealer.`,
      featured: true,
      features: [
        { label: "Full desk: work orders, customers, farms, and sales packages", included: true },
        leadHelperSeatFeature(),
        { label: "Multi-helper crews on every work order", included: true },
        { label: "In-app satellite maps + dispatch tiles", included: true },
        { label: `${shop.includedUsers} billable seats included`, included: true },
        { label: `Extra billable seats ${formatPlanCents(shop.extraSeatCents)}/user/month`, included: true },
        { label: `Up to ${shop.maxStores} stores`, included: true },
        {
          label: `Reveal GPS add-on ${formatPlanCents(shop.revealAddOnCents)}/month`,
          included: false,
          optional: true,
        },
        {
          label: "Handwritten scans, forms, inspections, QuickBooks (Platform)",
          included: false,
          optional: true,
        },
        { label: "Unlimited users and stores", included: false },
        { label: "Live GPS included", included: false },
        smsSetupFeature(),
      ],
    },
    {
      id: "ENTERPRISE",
      name: enterprise.label,
      price: formatPlanCents(enterprise.monthlyCents),
      priceNote: "per month · unlimited billable users",
      description:
        "Unlimited seats and stores. Verizon GPS, handwritten scans, office forms, pivot inspections, and QuickBooks Desktop are on by default. Platform can still override GPS, seats, and add-ons per dealer.",
      features: [
        { label: "Full desk: work orders, customers, farms, and sales packages", included: true },
        leadHelperSeatFeature(),
        { label: "Multi-helper crews on every work order", included: true },
        { label: "In-app satellite maps + dispatch tiles", included: true },
        { label: "Unlimited billable users and stores", included: true },
        { label: "Verizon GPS included", included: true },
        { label: "Other GPS via Platform (no setup fee)", included: true },
        { label: "Handwritten work-order scans", included: true },
        { label: "Office forms", included: true },
        { label: "Pivot inspections", included: true },
        { label: "QuickBooks Desktop estimates", included: true },
        {
          label: "Inspection customer list: Ag Desk or QuickBooks",
          included: true,
          optional: true,
        },
        smsSetupFeature(),
      ],
    },
  ];
}

/** Options Ag Desk Pro can set per company from Platform (shown on the public pricing page). */
export function landingPlatformOptions(): { title: string; detail: string }[] {
  return [
    {
      title: "Plan version",
      detail: "Starter, Shop, or Enterprise — flip a dealer without a redeploy.",
    },
    {
      title: "Billable seats & store cap",
      detail: `Override included seats and store limits. Each Lead Technician still includes ${FREE_HELPERS_PER_LEAD} Staff Technicians free.`,
    },
    {
      title: "GPS provider",
      detail: "NONE, Reveal, Verizon, or another provider. Shop can add Reveal; Enterprise includes Verizon.",
    },
    {
      title: "Handwritten scans",
      detail: "Turn OCR work-order import on or off per company (on by default for Enterprise).",
    },
    {
      title: "Office forms",
      detail: "Enable printable office tickets and service-order capture per dealer.",
    },
    {
      title: "Pivot inspections",
      detail: "Seasonal inspection workflows, with Ag Desk or QuickBooks customer lists.",
    },
    {
      title: "QuickBooks Desktop",
      detail: "Web Connector estimates — on for Enterprise, available as a Platform flag for others.",
    },
    {
      title: "SMS setup",
      detail: `${formatPlanCents(SMS_SETUP_CENTS)} one-time Bird/10DLC setup: mark due, paid, or waived.`,
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
