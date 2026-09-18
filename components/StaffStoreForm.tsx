import { ActionForm } from "@/components/ActionForm";
import { StoreSelect } from "@/components/StoreSelect";
import { updateStaffStoreAction } from "@/lib/actions";

export function StaffStoreForm({
  userId,
  stores,
  defaultValue,
  next,
}: {
  userId: string;
  stores: { id: string; name: string }[];
  defaultValue?: string | null;
  next: "/staff" | "/technicians" | "/managers";
}) {
  if (stores.length === 0) return null;

  return (
    <ActionForm action={updateStaffStoreAction} className="mt-2 flex flex-wrap items-end gap-2">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="next" value={next} />
      <div className="min-w-48 flex-1">
        <StoreSelect stores={stores} defaultValue={defaultValue} label="Default store" />
      </div>
      <button className="rounded-md bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white">Save store</button>
    </ActionForm>
  );
}
