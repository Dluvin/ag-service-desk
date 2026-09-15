"use client";

import { useState } from "react";
import { TICKET_STATUSES, STATUS_LABELS, type TicketStatus } from "@/lib/roles";

export function TicketStatusFields({
  status,
  invoiceNumber,
}: {
  status: string;
  invoiceNumber?: string | null;
}) {
  const [current, setCurrent] = useState(status);
  const needsInvoice = current === "COMPLETED";

  return (
    <>
      <label className="block text-sm font-medium">
        Status
        <select
          name="status"
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        >
          {TICKET_STATUSES.map((value) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value as TicketStatus]}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium">
        Invoice number {needsInvoice ? <span className="text-red-700">(required to close)</span> : null}
        <input
          name="invoiceNumber"
          defaultValue={invoiceNumber ?? ""}
          required={needsInvoice}
          placeholder="QB or shop invoice #"
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        />
      </label>
    </>
  );
}
