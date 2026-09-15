export function parseMapsLocation(raw: string) {
  const text = raw.trim();
  const at = text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) return { latitude: Number(at[1]), longitude: Number(at[2]) };
  const q = text.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (q) return { latitude: Number(q[1]), longitude: Number(q[2]) };
  const search = text.match(/\/search\/(-?\d+\.\d+)\s*,\s*\+?(-?\d+\.\d+)/);
  if (search) return { latitude: Number(search[1]), longitude: Number(search[2]) };
  const ll = text.match(/[?&](?:ll|center)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (ll) return { latitude: Number(ll[1]), longitude: Number(ll[2]) };
  const bang = text.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (bang) return { latitude: Number(bang[1]), longitude: Number(bang[2]) };
  const pair = text.match(/^(-?\d+\.\d+)\s*,\s*\+?(-?\d+\.\d+)$/);
  if (pair) return { latitude: Number(pair[1]), longitude: Number(pair[2]) };
  return null;
}
