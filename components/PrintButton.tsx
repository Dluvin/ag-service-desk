"use client";

export function PrintButton({ label = "Print / Save as PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white"
    >
      {label}
    </button>
  );
}
