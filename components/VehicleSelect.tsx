export function VehicleSelect({
  vehicles,
  name = "revealVehicleNumber",
  defaultValue,
  label = "Reveal vehicle",
  compact = false,
}: {
  vehicles: { number: string; name: string }[];
  name?: string;
  defaultValue?: string | null;
  label?: string;
  compact?: boolean;
}) {
  const options = [...vehicles];
  if (defaultValue && !options.some((vehicle) => vehicle.number === defaultValue)) {
    options.unshift({ number: defaultValue, name: `${defaultValue} (not in Verizon list)` });
  }

  return (
    <label className={compact ? "block text-xs font-medium sm:col-span-2" : "block text-sm font-medium"}>
      {label}
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className={
          compact
            ? "mt-1 w-full rounded-md border border-stone-300 px-2 py-1 text-sm"
            : "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        }
      >
        <option value="">Not mapped</option>
        {options.map((vehicle, index) => (
          <option key={`${vehicle.number}-${index}`} value={vehicle.number}>
            {vehicle.name} ({vehicle.number})
          </option>
        ))}
      </select>
      {vehicles.length === 0 ? (
        <span className="mt-1 block text-xs font-normal text-stone-500">
          Sync trucks under Settings → Vehicles, then pick one here.
        </span>
      ) : null}
    </label>
  );
}
