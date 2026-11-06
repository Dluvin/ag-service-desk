"use client";

import { deleteInspectionAction } from "@/lib/inspection-actions";

export function InspectionDeleteButton({ id }: { id: string }) {
  return (
    <form
      action={deleteInspectionAction}
      onSubmit={(event) => {
        if (!window.confirm("Delete this inspection? The linked work order stays on file.")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-sm font-medium text-red-800 hover:underline">
        Delete
      </button>
    </form>
  );
}
