"use client";

type Marker = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  subtitle?: string;
};

export function GoogleMapPanel({
  markers,
  selectedId,
  onSelect,
}: {
  markers: Marker[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  const active = markers.find((m) => m.id === selectedId) ?? markers[0];

  if (!active) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-6 text-stone-600">
        No pivot locations yet.
      </div>
    );
  }

  const embed = `https://maps.google.com/maps?q=${active.lat},${active.lng}&z=15&output=embed`;
  const open = `https://www.google.com/maps?q=${active.lat},${active.lng}`;

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-stone-900">{active.name}</p>
          <p className="text-xs text-stone-500">
            {active.lat.toFixed(5)}, {active.lng.toFixed(5)}
            {active.subtitle ? ` · ${active.subtitle}` : ""}
          </p>
        </div>
        <a
          href={open}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-emerald-800 hover:underline"
        >
          Open in Google Maps
        </a>
      </div>
      <iframe
        title={`Google Map for ${active.name}`}
        src={embed}
        className="h-80 w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      {markers.length > 1 ? (
        <ul className="max-h-48 divide-y divide-stone-100 overflow-auto">
          {markers.map((marker) => (
            <li key={marker.id}>
              <button
                type="button"
                onClick={() => onSelect?.(marker.id)}
                className={`flex w-full items-start justify-between gap-3 px-4 py-2 text-left text-sm ${
                  marker.id === active.id ? "bg-emerald-50" : "hover:bg-stone-50"
                }`}
              >
                <span className="font-medium text-stone-800">{marker.name}</span>
                <span className="text-xs text-stone-500">{marker.subtitle}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
