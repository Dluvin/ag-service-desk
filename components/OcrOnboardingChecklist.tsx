import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { confirmOcrBoxesAction, markOcrFieldListReviewedAction } from "@/lib/actions";
import { ocrOnboardingDoneCount, ocrOnboardingSteps } from "@/lib/ocr-onboarding";
import { t, type Locale, type MessageKey } from "@/lib/i18n";
import type { OcrOnboardingKey } from "@/lib/ocr-onboarding";

const STEP_TITLE: Record<OcrOnboardingKey, MessageKey> = {
  flag: "ocrOnboard.flag",
  upload: "ocrOnboard.upload",
  boxes: "ocrOnboard.boxes",
  scan: "ocrOnboard.scan",
  fields: "ocrOnboard.fields",
};
const STEP_HELP: Record<OcrOnboardingKey, MessageKey> = {
  flag: "ocrOnboard.flagHelp",
  upload: "ocrOnboard.uploadHelp",
  boxes: "ocrOnboard.boxesHelp",
  scan: "ocrOnboard.scanHelp",
  fields: "ocrOnboard.fieldsHelp",
};

export function OcrOnboardingChecklist({
  locale,
  ocrOn,
  sampleCount,
  boxesConfirmed,
  firstScan,
  fieldListReviewed,
}: {
  locale: Locale;
  ocrOn: boolean;
  sampleCount: number;
  boxesConfirmed: boolean;
  firstScan: boolean;
  fieldListReviewed: boolean;
}) {
  const steps = ocrOnboardingSteps({
    ocrOn,
    sampleCount,
    boxesConfirmed,
    firstScan,
    fieldListReviewed,
  });
  const done = ocrOnboardingDoneCount(steps);

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4">
      <h2 className="font-display text-xl">{t(locale, "ocrOnboard.title")}</h2>
      <p className="mt-1 text-sm text-stone-600">{t(locale, "ocrOnboard.help")}</p>
      <p className="mt-2 text-xs font-medium text-stone-500">
        {t(locale, "ocrOnboard.progress", { done, total: steps.length })}
      </p>
      <ol className="mt-4 space-y-3">
        {steps.map((step, index) => (
          <li key={step.key} className="flex gap-3">
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                step.done ? "bg-emerald-800 text-white" : "bg-stone-200 text-stone-600"
              }`}
            >
              {step.done ? "✓" : index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-stone-800">{t(locale, STEP_TITLE[step.key])}</p>
              <p className="mt-0.5 text-xs text-stone-500">{t(locale, STEP_HELP[step.key])}</p>
              {step.key === "boxes" && !step.done && sampleCount > 0 ? (
                <ActionForm action={confirmOcrBoxesAction} className="mt-2">
                  <button className="text-sm font-semibold text-emerald-800 hover:underline">
                    {t(locale, "ocrOnboard.confirmBoxes")}
                  </button>
                </ActionForm>
              ) : null}
              {step.key === "scan" && !step.done ? (
                <Link href="/tickets/new" className="mt-2 inline-block text-sm font-semibold text-emerald-800 hover:underline">
                  {t(locale, "ocrOnboard.scanJob")}
                </Link>
              ) : null}
              {step.key === "fields" && !step.done && firstScan ? (
                <ActionForm action={markOcrFieldListReviewedAction} className="mt-2">
                  <button className="text-sm font-semibold text-emerald-800 hover:underline">
                    {t(locale, "ocrOnboard.markFields")}
                  </button>
                </ActionForm>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
