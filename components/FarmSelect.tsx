import { UNASSIGNED_FARM_LABEL, type FarmOption } from "@/lib/farms";

export function FarmSelect({
  farms,
  farmerId,
  defaultFarmId,
  disabled,
  hint,
}: {
  farms: FarmOption[];
  farmerId: string;
  defaultFarmId?: string | null;
  disabled?: boolean;
  hint?: string;
}) {
  const options = farmerId ? farms.filter((farm) => farm.farmerId === farmerId) : [];
  const defaultValue = defaultFarmId && options.some((farm) => farm.id === defaultFarmId) ? defaultFarmId : "";

  return (
    <label className="block text-sm font-medium">
      Farm
      <select
        name="farmId"
        key={`${farmerId}:${defaultValue}`}
        defaultValue={defaultValue}
        disabled={disabled}
        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 disabled:bg-stone-50"
      >
        <option value="">{UNASSIGNED_FARM_LABEL}</option>
        {options.map((farm) => (
          <option key={farm.id} value={farm.id}>
            {farm.name}
          </option>
        ))}
      </select>
      <span className="mt-1 block text-xs font-normal text-stone-500">
        {hint ??
          "Optional. Multiple assets can sit at one farm. Leave Unassigned if this asset is not tied to a farm."}
      </span>
    </label>
  );
}
