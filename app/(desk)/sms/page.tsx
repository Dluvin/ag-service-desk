import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { saveBirdSettingsAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { BirdTestForm } from "@/components/BirdTestForm";
import { EmailTestForm } from "@/components/EmailTestForm";
import { notifyChannelOf } from "@/lib/notify-channel";

export default async function SmsSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== ROLES.ADMIN) redirect("/dashboard");

  const org = await prisma.organization.findUnique({ where: { id: session.organizationId } });
  if (!org) redirect("/dashboard");
  const channel = notifyChannelOf(org);
  const choices = [
    ["OFF", "Off"],
    ["SMS", "SMS only"],
    ["EMAIL", "Email only"],
    ["BOTH", "SMS and email"],
  ] as const;

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl">SMS and email</h1>
      <p className="mt-2 text-stone-600">
        The same alerts can go by text, email, or both. When a customer opens a work order, managers
        at that customer&apos;s store are notified. If the customer has no store, every manager is
        notified. A technician is notified only when the work order is assigned to them. Status
        changes notify the store&apos;s managers. When a work order is moved to Repair done,
        office/clerical at that store are also notified, and the customer is notified. Customers are
        not notified on Assigned, In progress, Waiting on parts, Completed, or Cancelled. Staff
        messages include a link to that work order. Texts use each person&apos;s phone. Emails use
        each person&apos;s email. Customer texts use contact phones, and customer emails use contact
        emails, or the customer email when there is no contact email.
      </p>
      <p className="mt-3 text-sm text-stone-600">
        Bird charges separately for numbers and each text. Resend charges for email after its free
        allowance.{" "}
        <Link href="/help/sms" className="font-semibold text-emerald-800 hover:underline">
          SMS setup
        </Link>{" "}
        and{" "}
        <Link href="/help/email" className="font-semibold text-emerald-800 hover:underline">
          Email setup
        </Link>{" "}
        walk through each account. Call David at{" "}
        <a href="tel:+12299389001" className="font-semibold text-emerald-800 hover:underline">
          229-938-9001
        </a>{" "}
        if you need help setting this up.
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
        <fieldset>
          <legend className="text-sm font-medium">Alerts</legend>
          <div className="mt-2 flex flex-wrap gap-4">
            {choices.map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm">
                <input type="radio" name="notifyChannel" value={value} defaultChecked={channel === value} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Bird SMS</p>
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
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Resend email</p>
        <label className="block text-sm font-medium">
          Resend API key
          <input
            name="resendApiKey"
            type="password"
            placeholder={org.resendApiKey ? "Saved — leave blank to keep" : "re_…"}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm font-medium">
          From address
          <input
            name="resendFrom"
            type="email"
            defaultValue={org.resendFrom ?? ""}
            placeholder="service@yourdealership.com"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
          <span className="mt-1 block text-xs font-normal text-stone-500">
            Must be an address on a domain you verified in Resend.
          </span>
        </label>
        <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Save settings</button>
      </ActionForm>

      {org.birdApiKey ? <BirdTestForm /> : null}
      {org.resendApiKey ? <EmailTestForm /> : null}
    </div>
  );
}
