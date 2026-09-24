"use client";

import { ActionForm } from "@/components/ActionForm";
import { useT } from "@/components/I18nProvider";
import {
  removeTicketFormSampleAction,
  saveTicketFormTemplateAction,
  uploadTicketFormSamplesAction,
} from "@/lib/actions";
import { OCR_TEMPLATES, type OcrTemplateKey } from "@/lib/ocr-templates";

const MAX_SAMPLES = 2;

export function TicketFormSettings({
  templateKey,
  fieldNotes,
  samples,
}: {
  templateKey: OcrTemplateKey;
  fieldNotes: string;
  samples: { id: string; fileName: string }[];
}) {
  const t = useT();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl">{t("ticketForm.title")}</h2>
        <p className="mt-2 text-sm text-stone-600">{t("ticketForm.help")}</p>
      </div>

      <ActionForm action={saveTicketFormTemplateAction} className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
        <label className="block text-sm font-medium">
          {t("ticketForm.layout")}
          <select name="ocrTemplateKey" defaultValue={templateKey} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2">
            {Object.values(OCR_TEMPLATES).map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          {t("ticketForm.fields")}
          <textarea
            name="ocrFieldNotes"
            rows={3}
            defaultValue={fieldNotes}
            placeholder={t("ticketForm.fieldsHint")}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </label>
        <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
          {t("ticketForm.saveLayout")}
        </button>
      </ActionForm>

      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <p className="text-sm font-medium text-stone-700">{t("ticketForm.samples")}</p>
        <p className="mt-1 text-xs text-stone-500">{t("ticketForm.samplesHelp")}</p>
        {samples.length ? (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {samples.map((sample) => (
              <li key={sample.id} className="rounded-lg border border-stone-200 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/ocr-samples/${sample.id}`}
                  alt={sample.fileName}
                  className="max-h-40 w-full object-contain"
                />
                <p className="mt-2 truncate text-xs text-stone-500">{sample.fileName}</p>
                <ActionForm action={removeTicketFormSampleAction} className="mt-2">
                  <input type="hidden" name="sampleId" value={sample.id} />
                  <button className="text-sm font-semibold text-red-800 hover:underline">
                    {t("ticketForm.removeSample")}
                  </button>
                </ActionForm>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-stone-600">{t("ticketForm.noSamples")}</p>
        )}
        {samples.length < MAX_SAMPLES ? (
          <ActionForm action={uploadTicketFormSamplesAction} encType="multipart/form-data" className="mt-4 space-y-3">
            <label className="block text-sm font-medium">
              {t("ticketForm.upload")}
              <input
                name="ticketSamples"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                required
                className="mt-1 w-full text-sm"
              />
            </label>
            <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
              {t("ticketForm.saveSamples")}
            </button>
          </ActionForm>
        ) : null}
      </div>
    </div>
  );
}
