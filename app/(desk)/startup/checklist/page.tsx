import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { canEditStartupChecklist } from "@/lib/roles";
import {
  addStartupCheckTemplateAction,
  deleteStartupCheckTemplateAction,
  updateStartupCheckTemplateAction,
} from "@/lib/actions";
import { ensureStartupTemplates } from "@/lib/startup";
import { ActionForm } from "@/components/ActionForm";
import { DeleteButton } from "@/components/DeleteButton";

export default async function StartupChecklistPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canEditStartupChecklist(session.role)) redirect("/startup");

  const items = await ensureStartupTemplates(session.organizationId);

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <p className="text-sm text-stone-500">
          <Link href="/startup" className="hover:underline">
            Maintenance
          </Link>
        </p>
        <h1 className="font-display text-3xl">Pre-season checklist</h1>
        <p className="mt-1 text-sm text-stone-600">
          These items are copied onto each new inspection. Changing the list does not rewrite
          checklists already started.
        </p>
        <ul className="mt-6 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-stone-200 bg-white p-4">
              <ActionForm action={updateStartupCheckTemplateAction} className="space-y-3">
                <input type="hidden" name="id" value={item.id} />
                <label className="block text-sm font-medium">
                  Item
                  <input name="label" required defaultValue={item.label} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
                </label>
                <label className="block text-sm font-medium">
                  What to check
                  <input name="detail" defaultValue={item.detail} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <button className="rounded-lg bg-emerald-800 px-3 py-1.5 text-sm font-semibold text-white">
                    Save
                  </button>
                  <DeleteButton
                    action={deleteStartupCheckTemplateAction}
                    name="id"
                    value={item.id}
                    label="Remove"
                    confirmText={`Remove "${item.label}" from the checklist?`}
                  />
                </div>
              </ActionForm>
            </li>
          ))}
        </ul>
      </div>
      <div className="lg:col-span-2">
        <h2 className="font-display text-xl">Add item</h2>
        <ActionForm action={addStartupCheckTemplateAction} className="mt-3 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
          <label className="block text-sm font-medium">
            Item
            <input name="label" required placeholder="Gearboxes and drivetrain" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            What to check
            <input name="detail" placeholder="Oil level, leaks, and u-joints." className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Add to checklist</button>
        </ActionForm>
      </div>
    </div>
  );
}
