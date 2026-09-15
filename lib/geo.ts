const EARTH_METERS = 6_371_000;

function toRad(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function metersBetween(lat1: number, lng1: number, lat2: number, lng2: number) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
}
