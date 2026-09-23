import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canEditDeskSettings } from "@/lib/roles";
import { homePath } from "@/lib/home";
import { loadUserDispatchView } from "@/lib/dispatch-view";
import { saveDispatchViewAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function DeskSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canEditDeskSettings(session.role)) redirect(homePath(session.role));

  const dispatchView = await loadUserDispatchView(session.userId);

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-3xl">Desk settings</h1>
      <p className="mt-2 text-stone-600">
        Choose how you see the dispatch board. This is your preference — other managers can pick a
        different view.
      </p>
      <div className="mt-6 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
        <p className="text-sm font-medium">Appearance</p>
        <p className="text-sm text-stone-600">
          Dark mode is saved on this device. With no saved choice, the desk follows your system
          theme.
        </p>
        <ThemeToggle />
      </div>
      <ActionForm action={saveDispatchViewAction} className="mt-6 space-y-4 rounded-xl border border-stone-200 bg-white p-4">
        <p className="text-sm font-medium">Dispatch view</p>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-stone-200 p-3 has-[:checked]:border-emerald-800 has-[:checked]:bg-emerald-50">
          <input
            type="radio"
            name="dispatchView"
            value="LIST"
            defaultChecked={dispatchView === "LIST"}
            className="mt-1 size-4 border-stone-300 text-emerald-800"
          />
          <span>
            <span className="block text-sm font-semibold">List view</span>
            <span className="mt-0.5 block text-sm text-stone-600">
              Default. All work orders in one list, with status chips and Hide completed.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-stone-200 p-3 has-[:checked]:border-emerald-800 has-[:checked]:bg-emerald-50">
          <input
            type="radio"
            name="dispatchView"
            value="TILES"
            defaultChecked={dispatchView === "TILES"}
            className="mt-1 size-4 border-stone-300 text-emerald-800"
          />
          <span>
            <span className="block text-sm font-semibold">Tiles view</span>
            <span className="mt-0.5 block text-sm text-stone-600">
              Columns by status, like the old dispatch board. Open work only.
            </span>
          </span>
        </label>
        <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Save</button>
      </ActionForm>
    </div>
  );
}
