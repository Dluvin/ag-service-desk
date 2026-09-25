export const OCR_FILL_NEW_SITE_EVENT = "ag-desk-ocr-fill-new-site";

export type OcrFillLine = {
  quantity: number;
  name: string;
  sku: string;
};

export type OcrFillNewSiteDetail = {
  customer?: string;
  farmName?: string;
  jobSite?: string;
  unitId?: string;
  unitType?: string;
  parts?: OcrFillLine[];
};

export function dispatchOcrFillNewSite(detail: OcrFillNewSiteDetail) {
  window.dispatchEvent(new CustomEvent(OCR_FILL_NEW_SITE_EVENT, { detail }));
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(llc|inc|co|corp|farms?|farm)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreName(name: string, query: string) {
  const n = normalize(name);
  const q = normalize(query);
  if (!n || !q) return 0;
  if (n === q) return 100;
  if (n.startsWith(q) || q.startsWith(n)) return 86;
  if (n.includes(q) || q.includes(n)) return 72;
  const nTokens = new Set(n.split(" ").filter(Boolean));
  const qTokens = q.split(" ").filter((token) => token.length > 1);
  if (!qTokens.length) return 0;
  const hits = qTokens.filter((token) => nTokens.has(token) || [...nTokens].some((part) => part.startsWith(token) || token.startsWith(part)));
  if (hits.length === qTokens.length && qTokens.length >= 1) return 64;
  if (hits.length >= 2) return 58;
  return 0;
}

export function bestNameMatch<T>(items: T[], getName: (item: T) => string, queries: Array<string | undefined>, minScore = 58) {
  const qs = queries.map((query) => query?.trim() ?? "").filter(Boolean);
  if (!qs.length) return null;
  let best: { item: T; score: number } | null = null;
  for (const item of items) {
    const name = getName(item);
    for (const query of qs) {
      const score = scoreName(name, query);
      if (score && (!best || score > best.score)) best = { item, score };
    }
  }
  return best && best.score >= minScore ? best.item : null;
}

export function typeSlugFromOcrUnit(unitType: string | undefined, types: Array<{ slug: string; name: string }>) {
  const raw = (unitType ?? "").toLowerCase();
  if (!raw) return null;
  const pick = (slug: string) => types.find((type) => type.slug === slug)?.slug ?? null;
  if (/\bwells?\b/.test(raw)) return pick("wells");
  if (/\bpumps?\b/.test(raw)) return pick("pumps");
  if (/\bgenerat/.test(raw)) return pick("generators");
  if (/\bpivots?\b|\bsprinkler|\bvalley|\bzimmatic|\bcenter\b/.test(raw)) return pick("pivots");
  return null;
}
