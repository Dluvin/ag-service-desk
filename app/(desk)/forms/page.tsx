import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isShopStaff } from "@/lib/roles";
import { OFFICE_FORMS } from "@/lib/office-forms";
import { getRequestLocale } from "@/lib/user-locale";
import { t } from "@/lib/i18n";

export default async function FormsIndexPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isShopStaff(session.role)) notFound();
  const locale = await getRequestLocale();

  return (
    <div>
      <h1 className="font-display text-3xl">{t(locale, "forms.title")}</h1>
      <p className="mt-2 max-w-2xl text-stone-600">{t(locale, "forms.help")}</p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {OFFICE_FORMS.map((form) => (
          <li key={form.slug}>
            <Link
              href={`/forms/${form.slug}`}
              className="block rounded-xl border border-stone-200 bg-white p-4 hover:border-emerald-700"
            >
              <h2 className="font-display text-xl">{t(locale, form.titleKey)}</h2>
              <p className="mt-1 text-sm text-stone-600">{t(locale, form.blurbKey)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
