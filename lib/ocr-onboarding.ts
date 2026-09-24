export const OCR_ONBOARDING_KEYS = ["flag", "upload", "boxes", "scan", "fields"] as const;
export type OcrOnboardingKey = (typeof OCR_ONBOARDING_KEYS)[number];

export type OcrOnboardingStep = {
  key: OcrOnboardingKey;
  done: boolean;
};

export function ocrOnboardingSteps(input: {
  ocrOn: boolean;
  sampleCount: number;
  boxesConfirmed: boolean;
  firstScan: boolean;
  fieldListReviewed: boolean;
}): OcrOnboardingStep[] {
  return [
    { key: "flag", done: input.ocrOn },
    { key: "upload", done: input.sampleCount > 0 },
    { key: "boxes", done: input.boxesConfirmed },
    { key: "scan", done: input.firstScan },
    { key: "fields", done: input.fieldListReviewed },
  ];
}

export function ocrOnboardingDoneCount(steps: OcrOnboardingStep[]) {
  return steps.filter((step) => step.done).length;
}
