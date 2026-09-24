import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { saveBirdSettingsAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { BirdTestForm } from "@/components/BirdTestForm";

export default async function SmsSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== ROLES.ADMIN) redirect("/dashboard");

  const org = await prisma.organization.findUnique({ where: { id: session.organizationId } });
  if (!org) redirect("/dashboard");

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl">Bird SMS</h1>
      <p className="mt-2 text-stone-600">
        When a customer opens a work order, Bird texts the managers at that customer&apos;s store. If
        the customer has no store, it texts every manager. A technician is texted only when the work
        order is assigned to them. Status changes text the store&apos;s managers (or all managers if
        there is no store). When a work order is moved to Repair done, office/clerical at that store
        are also texted (or every office/clerical login if there is no store). Customers are texted
        and emailed only when a work order is moved to Repair done — not on Assigned, In progress,
        Waiting on parts, Completed, or Cancelled. Staff messages include a link to that work order.
        Manager, office/clerical, and technician numbers come from each person&apos;s phone field;
        customer texts use customer contact phones, and the customer email uses the farmer email.
      </p>
      <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-stone-600">
        <li>In Bird, enable the US (and any other countries you serve) under SMS Destinations.</li>
        <li>
          Create an API key with <code className="rounded bg-stone-100 px-1">sms:write</code> (
          <code className="rounded bg-stone-100 px-1">bk_us1_…</code> or{" "}
          <code className="rounded bg-stone-100 px-1">bk_eu1_…</code>), or use an Access Key plus SMS
          channel.
        </li>
        <li>Set a from-number or alphanumeric sender your workspace owns.</li>
      </ol>

      <ActionForm action={saveBirdSettingsAction} className="mt-6 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="birdSmsEnabled" defaultChecked={org.birdSmsEnabled} className="rounded border-stone-300" />
          Send SMS on assign and work order updates
        </label>
        <label className="block text-sm font-medium">
          API key
          <input
            name="birdApiKey"
            type="password"
            placeholder={org.birdApiKey ? "Saved — leave blank to keep" : "bk_us1_… or AccessKey"}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm font-medium">
          From (sender ID or E.164 number)
          <input
            name="birdFrom"
            defaultValue={org.birdFrom ?? ""}
            placeholder="Heartland or +14025550100"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Access Key channel (optional)</p>
        <label className="block text-sm font-medium">
          Workspace ID
          <input
            name="birdWorkspaceId"
            defaultValue={org.birdWorkspaceId ?? ""}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm font-medium">
          SMS channel ID
          <input
            name="birdChannelId"
            defaultValue={org.birdChannelId ?? ""}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Save SMS settings</button>
      </ActionForm>

      {org.birdApiKey ? <BirdTestForm /> : null}
    </div>
  );
}
