export function StoreSelect({
  stores,
  name = "storeId",
  defaultValue,
  label = "Default store",
}: {
  stores: { id: string; name: string }[];
  name?: string;
  defaultValue?: string | null;
  label?: string;
}) {
  if (stores.length === 0) {
    return <p className="text-sm text-stone-600">Add stores under Settings first, then you can assign a default store.</p>;
  }

  return (
    <label className="block text-sm font-medium">
      {label}
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
      >
        <option value="">No store</option>
        {stores.map((store) => (
          <option key={store.id} value={store.id}>
            {store.name}
          </option>
        ))}
      </select>
    </label>
  );
}
