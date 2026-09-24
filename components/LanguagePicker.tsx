"use client";

import { usePathname } from "next/navigation";
import { saveLocaleAction } from "@/lib/actions";
import { t, type Locale } from "@/lib/i18n";

export function LanguagePicker({
  locale,
  variant = "nav",
}: {
  locale: Locale;
  variant?: "nav" | "panel";
}) {
  const pathname = usePathname() || "/";
  const nextLocale: Locale = locale === "es" ? "en" : "es";
  const className =
    variant === "nav"
      ? "rounded-md border border-emerald-700 px-3 py-1.5 text-xs hover:bg-emerald-900"
      : "rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-800 hover:bg-stone-50";

  return (
    <form action={saveLocaleAction}>
      <input type="hidden" name="locale" value={nextLocale} />
      <input type="hidden" name="next" value={pathname} />
      <button type="submit" className={className}>
        {t(locale, nextLocale === "es" ? "lang.switchToEs" : "lang.switchToEn")}
      </button>
    </form>
  );
}
