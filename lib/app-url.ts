export function appBaseUrl() {
  const raw = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "";
  if (raw) return raw.replace(/\/$/, "");
  if (process.env.NODE_ENV !== "production") return "http://localhost:3002";
  return "";
}
