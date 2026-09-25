"use client";

import { useActionState, useEffect, useState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { useT } from "@/components/I18nProvider";
import { applyHandwrittenTicketAction, scanHandwrittenTicketAction } from "@/lib/actions";
import { emptyOcrDraft, type OcrLineItem, type TicketOcrDraft } from "@/lib/ticket-ocr";
import { dispatchOcrFillNewSite } from "@/lib/ocr-site-match";

type ScanState = { error?: string; draft?: TicketOcrDraft } | null;

function LineEditor({
  title,
  prefix,
  qtyLabel,
  rows,
  onChange,
}: {
  title: string;
  prefix: string;
  qtyLabel: string;
  rows: OcrLineItem[];
  onChange: (rows: OcrLineItem[]) => void;
}) {
  const t = useT();
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{title}</legend>
      <input type="hidden" name={`${prefix}Count`} value={rows.length} />
      {rows.map((row, index) => (
        <div key={`${prefix}-${index}`} className="grid gap-2 sm:grid-cols-12">
          <input
            name={`${prefix}.${index}.quantity`}
            type="number"
            step="0.01"
            min="0"
            value={row.quantity}
            onChange={(event) => {
              const next = [...rows];
              next[index] = { ...row, quantity: Number(event.target.value) || 0 };
              onChange(next);
            }}
            className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm sm:col-span-2"
            aria-label={qtyLabel}
          />
          <input
            name={`${prefix}.${index}.sku`}
            value={row.sku}
            placeholder={t("ocr.sku")}
            onChange={(event) => {
              const next = [...rows];
              next[index] = { ...row, sku: event.target.value };
              onChange(next);
            }}
            className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm sm:col-span-3"
          />
          <input
            name={`${prefix}.${index}.name`}
            value={row.name}
            placeholder={t("ocr.itemName")}
            onChange={(event) => {
              const next = [...rows];
              next[index] = { ...row, name: event.target.value };
              onChange(next);
            }}
            className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm sm:col-span-7"
          />
        </div>
      ))}
      <button
        type="button"
        className="text-sm font-semibold text-emerald-800"
        onClick={() => onChange([...rows, { quantity: 1, name: "", sku: "", notes: "" }])}
      >
        {t("ocr.addRow")}
      </button>
    </fieldset>
  );
}

export function TicketOcrImport({
  ticketId,
  photos,
  configured,
  enabled = true,
}: {
  ticketId?: string;
  photos?: { id: string; fileName: string }[];
  configured: boolean;
  enabled?: boolean;
}) {
  const t = useT();
  const [scanState, scanAction, scanning] = useActionState(
    async (_prev: ScanState, formData: FormData) => {
      const result = await scanHandwrittenTicketAction(formData);
      return result;
    },
    null,
  );
  const [draft, setDraft] = useState<TicketOcrDraft>(emptyOcrDraft());

  useEffect(() => {
    if (scanState?.draft) setDraft(scanState.draft);
  }, [scanState]);

  const canScan = configured && enabled;

  return (
    <div className="space-y-4 rounded-xl border border-stone-200 bg-white p-4">
      <h2 className="font-display text-xl">{t("ocr.title")}</h2>
      <p className="text-sm text-stone-600">{t("ocr.help")}</p>
      {ticketId ? <p className="text-sm text-stone-600">{t("ocr.applyHelp")}</p> : null}
      {!enabled ? <p className="text-sm text-amber-800">{t("ocr.notEnabled")}</p> : null}
      {enabled && !configured ? <p className="text-sm text-amber-800">{t("ocr.notConfigured")}</p> : null}

      <form action={scanAction} encType="multipart/form-data" className="space-y-3">
        {photos?.length ? (
          <label className="block text-sm font-medium">
            {t("ocr.fromPhoto")}
            <select name="photoId" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2">
              <option value="">{t("ocr.newPhoto")}</option>
              {photos.map((photo) => (
                <option key={photo.id} value={photo.id}>
                  {photo.fileName}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="block text-sm font-medium">
          {t("ocr.photo")}
          <input name="ocrPhoto" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="mt-1 w-full text-sm" />
        </label>
        {scanState?.error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{scanState.error}</p>
        ) : null}
        <button
          className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          disabled={!canScan || scanning}
        >
          {scanning ? t("ocr.scanning") : t("ocr.scan")}
        </button>
      </form>

      {scanState?.draft ? (
        ticketId ? (
          <ActionForm action={applyHandwrittenTicketAction} encType="multipart/form-data" className="space-y-3 border-t border-stone-200 pt-4">
            <input type="hidden" name="ticketId" value={ticketId} />
            <p className="text-sm font-medium">{t("ocr.review")}</p>
            <label className="block text-sm font-medium">
              {t("ticket.title")}
              <input
                name="title"
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </label>
            <p className="text-xs text-stone-500">{t("ocr.titleStays")}</p>
            <label className="block text-sm font-medium">
              {t("ticket.description")}
              <textarea
                name="description"
                rows={4}
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                {t("common.customer")}
                <input
                  name="customer"
                  value={draft.customer}
                  readOnly
                  className="mt-1 w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2"
                />
              </label>
              <label className="block text-sm font-medium">
                {t("ocr.jobSite")}
                <input
                  name="jobSite"
                  value={draft.jobSite}
                  readOnly
                  className="mt-1 w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2"
                />
              </label>
              <label className="block text-sm font-medium">
                {t("common.technician")}
                <input
                  name="technician"
                  value={draft.technician}
                  onChange={(event) => setDraft({ ...draft, technician: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm font-medium">
                {t("ocr.date")}
                <input
                  name="date"
                  value={draft.date}
                  onChange={(event) => setDraft({ ...draft, date: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm font-medium">
                {t("ticket.invoiceNumber")}
                <input
                  name="invoiceNumber"
                  value={draft.invoiceNumber}
                  onChange={(event) => setDraft({ ...draft, invoiceNumber: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm font-medium">
                {t("ocr.invoiceAmount")}
                <input
                  name="invoiceAmount"
                  value={draft.invoiceAmount}
                  onChange={(event) => setDraft({ ...draft, invoiceAmount: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm font-medium">
                {t("ocr.paperNumber")}
                <input
                  name="paperNumber"
                  value={draft.paperNumber}
                  onChange={(event) => setDraft({ ...draft, paperNumber: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm font-medium">
                {t("ocr.farmName")}
                <input
                  name="farmName"
                  value={draft.farmName}
                  readOnly
                  className="mt-1 w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2"
                />
              </label>
              <label className="block text-sm font-medium">
                {t("ocr.unit")}
                <input
                  value={[draft.unitType, draft.unitId, draft.make, draft.model].filter(Boolean).join(" · ")}
                  readOnly
                  className="mt-1 w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2"
                />
              </label>
              <label className="block text-sm font-medium">
                {t("ocr.crewTimes")}
                <input
                  name="crew"
                  value={draft.crew}
                  onChange={(event) => setDraft({ ...draft, crew: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </label>
            </div>
            <input type="hidden" name="unitType" value={draft.unitType} />
            <input type="hidden" name="unitId" value={draft.unitId} />
            <input type="hidden" name="make" value={draft.make} />
            <input type="hidden" name="model" value={draft.model} />
            <input type="hidden" name="ageOfEq" value={draft.ageOfEq} />
            <input type="hidden" name="startTime" value={draft.startTime} />
            <input type="hidden" name="stopTime" value={draft.stopTime} />
            <input type="hidden" name="laborHours" value={draft.laborHours} />
            <input type="hidden" name="warranty" value={draft.warranty} />
            <label className="block text-sm font-medium">
              {t("ocr.problem")}
              <textarea
                name="problem"
                rows={3}
                value={draft.problem}
                onChange={(event) => setDraft({ ...draft, problem: event.target.value })}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm font-medium">
              {t("ocr.servicePerformed")}
              <textarea
                name="servicePerformed"
                rows={3}
                value={draft.servicePerformed}
                onChange={(event) => setDraft({ ...draft, servicePerformed: event.target.value })}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="applyTech" />
              {t("ocr.applyTech")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="applyInvoice" />
              {t("ocr.applyInvoice")}
            </label>
            <LineEditor
              title={t("ticket.parts")}
              prefix="parts"
              qtyLabel={t("ticket.quantity")}
              rows={draft.parts}
              onChange={(parts) => setDraft({ ...draft, parts })}
            />
            <LineEditor
              title={t("ticket.labor")}
              prefix="labor"
              qtyLabel={t("common.hours")}
              rows={draft.labor}
              onChange={(labor) => setDraft({ ...draft, labor })}
            />
            <LineEditor
              title={t("ticket.equipment")}
              prefix="equipment"
              qtyLabel={t("common.hours")}
              rows={draft.equipment}
              onChange={(equipment) => setDraft({ ...draft, equipment })}
            />
            <label className="block text-sm font-medium">
              {t("ocr.rawText")}
              <textarea
                name="rawText"
                rows={4}
                value={draft.rawText}
                onChange={(event) => setDraft({ ...draft, rawText: event.target.value })}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm font-medium">
              {t("ocr.keepPhoto")}
              <input name="photos" type="file" accept="image/*" className="mt-1 w-full text-sm" />
            </label>
            <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">{t("ocr.apply")}</button>
          </ActionForm>
        ) : (
          <div className="space-y-3 border-t border-stone-200 pt-4">
            <p className="text-sm font-medium">{t("ocr.review")}</p>
            <p className="text-sm text-stone-600">{t("ocr.fillNew")}</p>
            <button
              type="button"
              className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white"
              onClick={() => {
                const title = document.querySelector<HTMLInputElement>('form[enctype="multipart/form-data"] input[name="title"]')
                  ?? document.querySelector<HTMLInputElement>('input[name="title"]');
                const description = document.querySelector<HTMLTextAreaElement>('form[enctype="multipart/form-data"] textarea[name="description"]')
                  ?? document.querySelector<HTMLTextAreaElement>('textarea[name="description"]');
                if (title && draft.title) title.value = draft.title;
                if (description) {
                  const extra = [
                    draft.description,
                    draft.paperNumber && `Paper # ${draft.paperNumber}`,
                    draft.problem && `Problem: ${draft.problem}`,
                    draft.servicePerformed && `Service performed: ${draft.servicePerformed}`,
                  ]
                    .filter(Boolean)
                    .join("\n");
                  description.value = extra || draft.rawText;
                }
                dispatchOcrFillNewSite({
                  customer: draft.customer,
                  farmName: draft.farmName,
                  jobSite: draft.jobSite,
                  unitId: draft.unitId,
                  unitType: draft.unitType,
                  parts: draft.parts.map((row) => ({
                    quantity: row.quantity,
                    name: row.name,
                    sku: row.sku,
                  })),
                });
              }}
            >
              {t("ocr.fillForm")}
            </button>
          </div>
        )
      ) : null}
    </div>
  );
}
