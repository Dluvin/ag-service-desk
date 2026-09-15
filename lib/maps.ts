export function parseMapsLocation(raw: string) {
  const text = raw.trim();
  const at = text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) return { latitude: Number(at[1]), longitude: Number(at[2]) };
  const q = text.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (q) return { latitude: Number(q[1]), longitude: Number(q[2]) };
  const pair = text.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
  if (pair) return { latitude: Number(pair[1]), longitude: Number(pair[2]) };
  return null;
}
