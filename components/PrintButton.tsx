"use client";

import { useT } from "@/components/I18nProvider";

export function PrintButton({ label }: { label?: string }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white"
    >
      {label ?? t("common.printPdf")}
    </button>
  );
}
