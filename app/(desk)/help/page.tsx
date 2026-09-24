import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ActionForm } from "@/components/ActionForm";
import { deskSupportAction } from "@/lib/help-actions";
import { getRequestLocale } from "@/lib/user-locale";
import { t } from "@/lib/i18n";

export default async function DeskSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { sent } = await searchParams;
  const locale = await getRequestLocale();

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl">{t(locale, "help.title")}</h1>
      <p className="mt-2 text-stone-600">{t(locale, "help.intro")}</p>
      <p className="mt-2 text-sm text-stone-600">
        {t(locale, "help.seeFaq")}{" "}
        <Link href="/help/faq" className="font-semibold text-emerald-800 hover:underline">
          {t(locale, "faq.title")}
        </Link>
        .
      </p>

      {sent === "1" ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
          {t(locale, "help.sent")}
        </p>
      ) : null}

      <ActionForm
        action={deskSupportAction}
        className="mt-6 space-y-3 rounded-xl border border-stone-200 bg-white p-4"
      >
        <label className="block text-sm font-medium">
          {t(locale, "common.name")}
          <input
            name="name"
            type="text"
            required
            placeholder={t(locale, "help.namePlaceholder")}
            autoComplete="name"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm font-medium">
          {t(locale, "common.email")}
          <input
            name="email"
            type="email"
            required
            placeholder={t(locale, "help.emailPlaceholder")}
            autoComplete="email"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm font-medium">
          {t(locale, "help.message")}
          <textarea
            name="message"
            required
            rows={6}
            placeholder={t(locale, "help.messagePlaceholder")}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
          {t(locale, "help.send")}
        </button>
      </ActionForm>
    </div>
  );
}
