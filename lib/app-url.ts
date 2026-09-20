export function appBaseUrl() {
  const raw = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "";
  if (raw) return raw.replace(/\/$/, "");
  if (process.env.NODE_ENV !== "production") return "http://localhost:3002";
  return "";
}

export function brandLogoUrl() {
  const base = appBaseUrl();
  return base ? `${base}/brand-logo.png` : "";
}

export function brandLogoEmailHtml() {
  const src = brandLogoUrl();
  if (!src) return "";
  return `<p><img src="${src}" alt="AG Desk Pro" width="280" style="max-width:100%;height:auto" /></p>`;
}
