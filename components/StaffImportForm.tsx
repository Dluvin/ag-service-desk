import { importStaffAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";

export function StaffImportForm() {
  return (
    <>
      <h2 className="font-display text-xl">Bulk import staff</h2>
      <p className="mt-1 text-sm text-stone-600">
        CSV with Name, Email, and Role (Admin, Manager, Office/Clerical, or Technician). Phone and password can be
        on each row, or use the default password below. Leave passwords blank to send a welcome email
        so they set one. Matching emails update that person.
      </p>
      <p className="mt-1 text-sm">
        <a href="/staff-template.csv" className="text-emerald-800 hover:underline">
          Download a sample CSV
        </a>
      </p>
      <ActionForm action={importStaffAction} encType="multipart/form-data" className="mt-3 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
        <label className="block text-sm font-medium">
          CSV file
          <input name="file" type="file" accept=".csv,.txt" required className="mt-1 w-full text-sm" />
        </label>
        <label className="block text-sm font-medium">
          Default password if the CSV has none
          <input
            name="defaultPassword"
            type="password"
            minLength={8}
            placeholder="At least 8 characters"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
          Import staff
        </button>
      </ActionForm>
    </>
  );
}
