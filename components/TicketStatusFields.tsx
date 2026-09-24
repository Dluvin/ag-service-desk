"use client";

import { useState } from "react";
import { TICKET_STATUSES, requiresInvoice, type TicketStatus } from "@/lib/roles";
import { useLocale, useT } from "@/components/I18nProvider";
import { statusLabel } from "@/lib/i18n";

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
  const t = useT();
  const locale = useLocale();

  return (
    <>
      <label className="block text-sm font-medium">
        {t("ticket.status")}
        <select
          name="status"
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        >
          {TICKET_STATUSES.map((value) => (
            <option key={value} value={value}>
              {statusLabel(locale, value)}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          {t("ticket.invoiceNumber")} {needsInvoice ? <span className="text-red-700">{t("ticket.requiredToClose")}</span> : null}
          <input
            name="invoiceNumber"
            defaultValue={invoiceNumber ?? ""}
            required={needsInvoice}
            placeholder={t("ticket.invoicePlaceholder")}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm font-medium">
          {t("ticket.invoiceAmount")} {needsInvoice ? <span className="text-red-700">{t("ticket.requiredToClose")}</span> : null}
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
