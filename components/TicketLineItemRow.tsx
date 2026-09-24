"use client";

import { ActionForm } from "@/components/ActionForm";
import { DeleteButton } from "@/components/DeleteButton";
import { useT } from "@/components/I18nProvider";

type LineAction = (formData: FormData) => Promise<void | { error?: string }>;

export function TicketLineItemRow({
  id,
  name,
  sku,
  rate,
  amount,
  amountName,
  amountLabel,
  loggedBy,
  canEdit,
  updateAction,
  deleteAction,
  deleteLabel,
}: {
  id: string;
  name: string;
  sku: string | null;
  rate: string | null;
  amount: number;
  amountName: "quantity" | "hours";
  amountLabel: string;
  loggedBy: string;
  canEdit: boolean;
  updateAction: LineAction;
  deleteAction: LineAction;
  deleteLabel: string;
}) {
  const t = useT();
  return (
    <li className="flex flex-wrap items-end justify-between gap-3 px-4 py-3 text-sm">
      <div className="min-w-0 flex-1">
        <p className="font-medium">{name}</p>
        <p className="mt-0.5 text-xs text-stone-500">
          {[sku, rate, loggedBy].filter(Boolean).join(" · ")}
        </p>
      </div>
      {canEdit ? (
        <div className="flex flex-wrap items-end gap-2">
          <ActionForm action={updateAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="id" value={id} />
            <label className="text-xs font-medium text-stone-700">
              {amountLabel}
              <input
                name={amountName}
                type="number"
                min="0.25"
                step="0.25"
                defaultValue={amount}
                className="mt-1 block w-24 rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
              />
            </label>
            <button className="rounded-lg bg-emerald-800 px-3 py-1.5 text-sm font-semibold text-white">
              {t("common.save")}
            </button>
          </ActionForm>
          <DeleteButton
            action={deleteAction}
            name="id"
            value={id}
            label={t("common.remove")}
            confirmText={deleteLabel}
          />
        </div>
      ) : (
        <p className="font-medium">
          {amountName === "quantity" ? `${amount} ×` : t("ticket.hoursRead", { amount })}
        </p>
      )}
    </li>
  );
}
