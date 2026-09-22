import { ActionForm } from "@/components/ActionForm";
import { StoreSelect } from "@/components/StoreSelect";
import { VehicleSelect } from "@/components/VehicleSelect";
import { updateStaffAction } from "@/lib/actions";
import { ROLES } from "@/lib/roles";
import { roleLabel } from "@/lib/scope";

export function StaffEditForm({
  person,
  stores,
  next,
  roleOptions,
  vehicles = [],
  showGps = true,
}: {
  person: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    storeId: string | null;
    revealVehicleNumber: string | null;
  };
  stores: { id: string; name: string }[];
  next: "/staff" | "/technicians" | "/managers";
  roleOptions: string[];
  vehicles?: { number: string; name: string }[];
  showGps?: boolean;
}) {
  const showVehicle = person.role === ROLES.TECHNICIAN || roleOptions.includes(ROLES.TECHNICIAN);

  return (
    <ActionForm action={updateStaffAction} className="mt-2 grid gap-2 sm:grid-cols-2">
      <input type="hidden" name="userId" value={person.id} />
      <input type="hidden" name="next" value={next} />
      <label className="block text-xs font-medium">
        Name
        <input
          name="name"
          required
          defaultValue={person.name}
          className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1 text-sm"
        />
      </label>
      <label className="block text-xs font-medium">
        Email
        <input
          name="email"
          type="email"
          required
          defaultValue={person.email}
          className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1 text-sm"
        />
      </label>
      <label className="block text-xs font-medium">
        Role
        <select
          name="role"
          defaultValue={person.role}
          className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1 text-sm"
        >
          {roleOptions.map((role) => (
            <option key={role} value={role}>
              {roleLabel(role)}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium">
        New password
        <input
          name="password"
          type="password"
          minLength={8}
          placeholder="Leave blank to keep"
          className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1 text-sm"
        />
      </label>
      <label className="block text-xs font-medium">
        Mobile for SMS
        <input
          name="phone"
          defaultValue={person.phone ?? ""}
          placeholder="Optional"
          className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1 text-sm"
        />
      </label>
      {stores.length > 0 ? (
        <StoreSelect stores={stores} defaultValue={person.storeId} label="Default store" />
      ) : (
        <input type="hidden" name="storeId" value="" />
      )}
      {showGps && showVehicle ? (
        <VehicleSelect vehicles={vehicles} defaultValue={person.revealVehicleNumber} compact />
      ) : null}
      <div className="sm:col-span-2">
        <button className="rounded-md bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white">Save</button>
      </div>
    </ActionForm>
  );
}
