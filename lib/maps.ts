/** Hybrid satellite so field and road labels stay visible in Google Maps. */
export function googleMapsPlaceUrl(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}&t=h`;
}

export function googleMapsDirectionsUrl(points: Array<{ lat: number; lng: number }>) {
  if (points.length === 1) return googleMapsPlaceUrl(points[0].lat, points[0].lng);
  return `https://www.google.com/maps/dir/${points.map((point) => `${point.lat},${point.lng}`).join("/")}?t=h`;
}

export function googleMapsEmbedUrl(lat: number, lng: number, zoom = 15) {
  return `https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&t=h&output=embed`;
}

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
