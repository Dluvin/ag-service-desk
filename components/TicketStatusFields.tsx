"use client";

import { useState } from "react";
import { TICKET_STATUSES, STATUS_LABELS, requiresInvoice, type TicketStatus } from "@/lib/roles";

export function TicketStatusFields({
  status,
  invoiceNumber,
  invoiceAmount,
}: {
  status: string;
  invoiceNumber?: string | null;
  invoiceAmount?: number | null;
}) {
  const [current, setCurrent] = useState(status);
  const needsInvoice = requiresInvoice(current);

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
      <div className="grid gap-3 sm:grid-cols-2">
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
        <label className="block text-sm font-medium">
          Amount {needsInvoice ? <span className="text-red-700">(required to close)</span> : null}
          <input
            name="invoiceAmount"
            type="number"
            min="0"
            step="0.01"
            defaultValue={invoiceAmount != null ? invoiceAmount.toFixed(2) : ""}
            required={needsInvoice}
            placeholder="0.00"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
      </div>
    </>
  );
}
