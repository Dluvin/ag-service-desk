"use client";

import { stopImpersonatingAction } from "@/lib/platform-actions";

export function ImpersonationBanner({ companyName }: { companyName: string }) {
  return (
    <div className="no-print bg-amber-400 px-4 py-2 text-sm text-emerald-950">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
        <p>
          You are assisting <span className="font-semibold">{companyName}</span> as their admin for
          setup, training, or troubleshooting.
        </p>
        <form action={stopImpersonatingAction}>
          <button className="rounded-md bg-emerald-950 px-3 py-1 text-xs font-semibold text-amber-300 hover:bg-emerald-900">
            Return to platform
          </button>
        </form>
      </div>
    </div>
  );
}
