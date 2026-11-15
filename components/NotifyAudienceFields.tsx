"use client";

import { useState } from "react";
import type { NotifyRecipients } from "@/lib/notify-recipients";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Company admin",
  MANAGER: "Manager",
  CLERICAL: "Office",
  TECHNICIAN: "Technician",
};

export function NotifyAudienceFields({
  staff,
  recipients,
}: {
  staff: { id: string; name: string; role: string; phone: string | null; email: string }[];
  recipients: NotifyRecipients;
}) {
  const [mode, setMode] = useState<NotifyRecipients["mode"]>(recipients.mode);
  const sms = new Set(recipients.smsUserIds);
  const email = new Set(recipients.emailUserIds);

  return (
    <fieldset>
      <legend className="text-sm font-medium">Who gets shop alerts</legend>
      <div className="mt-2 flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="notifyAudience"
            value="AUTO"
            checked={mode === "AUTO"}
            onChange={() => setMode("AUTO")}
          />
          Automatic
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="notifyAudience"
            value="CHOSEN"
            checked={mode === "CHOSEN"}
            onChange={() => setMode("CHOSEN")}
          />
          Choose people
        </label>
      </div>
      <p className="mt-2 text-xs text-stone-500">
        Automatic texts the store&apos;s managers, the assigned technician, and office staff on Repair done.
        Choose people to send shop texts and emails only to the people you check. You can check more than one.
        Customer alerts still go to that customer&apos;s contacts.
      </p>
      <ul className={`mt-3 divide-y divide-stone-100 ${mode === "CHOSEN" ? "" : "hidden"}`}>
        {staff.length === 0 ? (
          <li className="py-2 text-sm text-stone-600">No staff yet.</li>
        ) : (
          staff.map((person) => (
            <li key={person.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
              <span className="text-sm">
                <span className="font-medium text-stone-900">{person.name}</span>
                <span className="text-stone-500"> · {ROLE_LABELS[person.role] ?? person.role}</span>
                {!person.phone ? <span className="text-stone-400"> · no phone</span> : null}
              </span>
              <span className="flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="smsUserId"
                    value={person.id}
                    defaultChecked={sms.has(person.id)}
                    className="rounded border-stone-300"
                  />
                  Text
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="emailUserId"
                    value={person.id}
                    defaultChecked={email.has(person.id)}
                    className="rounded border-stone-300"
                  />
                  Email
                </label>
              </span>
            </li>
          ))
        )}
      </ul>
    </fieldset>
  );
}
