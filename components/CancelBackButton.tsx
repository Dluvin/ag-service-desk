"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/components/I18nProvider";

export function CancelBackButton({ fallbackHref }: { fallbackHref: string }) {
  const router = useRouter();
  const t = useT();

  return (
    <button
      type="button"
      className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50"
      onClick={() => {
        const cameFromThisSite = document.referrer.startsWith(window.location.origin);
        if (cameFromThisSite) router.back();
        else router.push(fallbackHref);
      }}
    >
      {t("common.cancel")}
    </button>
  );
}
