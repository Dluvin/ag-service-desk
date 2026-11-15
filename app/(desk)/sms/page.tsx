import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES, SHOP_STAFF_ROLES, STATUS_LABELS, TICKET_STATUSES } from "@/lib/roles";
import { saveBirdSettingsAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { BirdTestForm } from "@/components/BirdTestForm";
import { EmailTestForm } from "@/components/EmailTestForm";
import { notifyChannelOf } from "@/lib/notify-channel";
import { parseStatusAlerts } from "@/lib/notify-status";
import { parseNotifyRecipients } from "@/lib/notify-recipients";
import { NotifyAudienceFields } from "@/components/NotifyAudienceFields";

export default async function SmsSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== ROLES.ADMIN) redirect("/dashboard");

  const [org, staff] = await Promise.all([
    prisma.organization.findUnique({ where: { id: session.organizationId } }),
    prisma.user.findMany({
      where: { organizationId: session.organizationId, role: { in: [...SHOP_STAFF_ROLES] } },
      select: { id: true, name: true, role: true, phone: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!org) redirect("/dashboard");
  const channel = notifyChannelOf(org);
  const statusAlerts = parseStatusAlerts(org.notifyStatusJson);
  const recipients = parseNotifyRecipients(org.notifyStatusJson);
  const choices = [
    ["OFF", "Off"],
    ["SMS", "SMS only"],
    ["EMAIL", "Email only"],
    ["BOTH", "SMS and email"],
  ] as const;

  return (
    <div className="max-w-6xl">
      <h1 className="font-display text-3xl">SMS and email</h1>
      <p className="mt-2 text-stone-600">
        The same alerts can go by text, email, or both. Each status can text or email admins,
        managers, office, the assigned technician, and the customer. Office gets the Repair done
        work order. Customer alerts go to that customer&apos;s contacts. Staff messages include a
        link to the work order.
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[64rem] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-stone-500">
                <th className="py-2 pr-3 font-semibold" rowSpan={2}>
                  Status
                </th>
                {(
                  [
                    ["Admin", "Company admins"],
                    ["Manager", "Managers at the customer's store"],
                    ["Office", "Office/clerical"],
                    ["Tech", "The assigned technician"],
                    ["Customer", "The customer's contacts"],
                  ] as const
                ).map(([label, title]) => (
                  <th key={label} className="px-2 py-2 text-center font-semibold" colSpan={2} title={title}>
                    {label}
                  </th>
                ))}
              </tr>
              <tr className="text-xs uppercase tracking-wide text-stone-500">
                {["Admin", "Manager", "Office", "Tech", "Customer"].flatMap((role) =>
                  ["Text", "Email"].map((channel) => (
                    <th key={`${role}-${channel}`} className="px-2 py-1 font-medium">
                      {channel}
                    </th>
                  )),
                )}
              </tr>
            </thead>
            <tbody>
              {TICKET_STATUSES.map((status) => (
                <tr key={status} className="border-t border-stone-100">
                  <th className="py-2 pr-3 font-medium text-stone-800">{STATUS_LABELS[status]}</th>
                  {(
                    [
                      ["adminSms", "Admin text"],
                      ["adminEmail", "Admin email"],
                      ["managerSms", "Manager text"],
                      ["managerEmail", "Manager email"],
                      ["officeSms", "Office text"],
                      ["officeEmail", "Office email"],
                      ["techSms", "Tech text"],
                      ["techEmail", "Tech email"],
                      ["customerSms", "Customer text"],
                      ["customerEmail", "Customer email"],
                    ] as const
                  ).map(([name, label]) => (
                    <td key={name} className="px-2 py-2">
                      <input
                        type="checkbox"
                        name={`${name}.${status}`}
                        aria-label={`${label} for ${STATUS_LABELS[status]}`}
                        defaultChecked={statusAlerts[status][name]}
                        className="rounded border-stone-300"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-stone-500">
          Admins, managers, and office only get alerts for their own store. A Repair done work order at one store does not email office, admin, or managers at another store. Tech means the technician assigned to that work order. Office email on Repair done includes the work order.
        </p>
        <NotifyAudienceFields staff={staff} recipients={recipients} />
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
      <EmailTestForm configured={Boolean(org.resendApiKey && org.resendFrom)} />
    </div>
  );
}
