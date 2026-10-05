import type { MessageKey } from "@/lib/i18n";

export type OfficeFormLogo = "dealer" | "agsense";

export type OfficeFormDef = {
  slug: string;
  titleKey: MessageKey;
  blurbKey: MessageKey;
  logo: OfficeFormLogo;
};

export const OFFICE_FORMS: OfficeFormDef[] = [
  {
    slug: "service-ticket",
    titleKey: "forms.service",
    blurbKey: "forms.serviceBlurb",
    logo: "dealer",
  },
  {
    slug: "counter-ticket",
    titleKey: "forms.counter",
    blurbKey: "forms.counterBlurb",
    logo: "dealer",
  },
  {
    slug: "po-ticket",
    titleKey: "forms.po",
    blurbKey: "forms.poBlurb",
    logo: "dealer",
  },
  {
    slug: "need-to-order",
    titleKey: "forms.needToOrder",
    blurbKey: "forms.needToOrderBlurb",
    logo: "dealer",
  },
  {
    slug: "motor-startup",
    titleKey: "forms.motor",
    blurbKey: "forms.motorBlurb",
    logo: "dealer",
  },
  {
    slug: "agsense-work-order",
    titleKey: "forms.agsense",
    blurbKey: "forms.agsenseBlurb",
    logo: "agsense",
  },
  {
    slug: "electrical-parts",
    titleKey: "forms.electrical",
    blurbKey: "forms.electricalBlurb",
    logo: "dealer",
  },
];

export function officeFormBySlug(slug: string) {
  return OFFICE_FORMS.find((form) => form.slug === slug) ?? null;
}

export const AGSENSE_LOGO_SRC = "/forms/agsense-logo.png";

export type OpenWorkOrderOption = {
  id: string;
  number: number;
  title: string;
  farmerName: string;
  pivotName: string;
  status: string;
};

const SKIP_FORM_KEYS = new Set([
  "ticketId",
  "formSlug",
  "workOrderMode",
  "workOrderTitle",
  "assetTypeSlug",
  "siteMode",
  "farmerMode",
  "farmerId",
  "pivotId",
  "assetId",
  "farmId",
  "farmerName",
  "farmerAddress",
  "farmerContactName",
  "farmerPhone",
  "farmerEmail",
  "assetName",
  "pivotName",
  "serialNumber",
  "mapsInput",
  "latitude",
  "longitude",
]);

export function serviceOrderTitle(formData: FormData, fallback: string) {
  const explicit = String(formData.get("workOrderTitle") ?? "").trim();
  if (explicit) return explicit.slice(0, 120);
  const problem = String(formData.get("problem") ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (problem) return problem.slice(0, 120);
  const farm = String(formData.get("farm_name") ?? "").trim();
  const unit = String(formData.get("unit_id") ?? "").trim();
  const fromSite = [farm, unit].filter(Boolean).join(" — ");
  if (fromSite) return fromSite.slice(0, 120);
  return fallback;
}

export function officeFormMessage(title: string, formData: FormData) {
  const lines = [`Office form: ${title}`];
  for (const [key, value] of formData.entries()) {
    if (SKIP_FORM_KEYS.has(key) || value instanceof File) continue;
    const text = String(value).trim();
    if (!text) continue;
    lines.push(`${prettyFormKey(key)}: ${text}`);
  }
  if (lines.length === 1) lines.push("(No fields filled.)");
  return lines.join("\n");
}

function prettyFormKey(key: string) {
  return key.replaceAll(".", " · ").replaceAll("_", " ");
}
