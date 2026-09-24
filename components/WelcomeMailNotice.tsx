"use client";

import { useT } from "@/components/I18nProvider";

export function WelcomeMailNotice({ status }: { status?: string }) {
  const t = useT();
  if (status === "sent") {
    return (
      <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
        {t("customers.welcome.sent")}
      </p>
    );
  }
  if (status === "skipped") {
    return (
      <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        {t("customers.welcome.skipped")}
      </p>
    );
  }
  if (status === "failed") {
    return (
      <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
        {t("customers.welcome.failed")}
      </p>
    );
  }
  return null;
}
