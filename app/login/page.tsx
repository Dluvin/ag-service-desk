import Link from "next/link";
import { loginAction } from "@/lib/actions";
import { getSession } from "@/lib/auth";
import { AuthBrandProvider, AuthEmailInput, AuthScreenLogos } from "@/components/AuthBrand";
import { ActionForm } from "@/components/ActionForm";
import { resolveKnownLoginBrand } from "@/lib/org-brand";
import { prisma } from "@/lib/prisma";
import { getRequestLocale } from "@/lib/user-locale";
import { t } from "@/lib/i18n";
import { LanguagePicker } from "@/components/LanguagePicker";
import { I18nProvider } from "@/components/I18nProvider";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ paused?: string; billing?: string }>;
}) {
  let userCount = 0;
  try {
    userCount = await prisma.user.count();
  } catch {
    userCount = 0;
  }
  const showDemo = process.env.NODE_ENV !== "production";
  const query = await searchParams;
  const session = await getSession();
  const dealer = await resolveKnownLoginBrand(session?.organizationId);
  const locale = await getRequestLocale();

  return (
    <I18nProvider locale={locale}>
    <div className="flex min-h-full items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <AuthBrandProvider initial={dealer}>
          <div>
            <div className="mb-4 flex justify-end">
              <LanguagePicker locale={locale} variant="panel" />
            </div>
            <AuthScreenLogos />
            <h1 className="font-display text-3xl">{t(locale, "login.title")}</h1>
            <p className="mt-1 text-sm text-stone-600">{t(locale, "login.blurb")}</p>
            {query.billing === "ok" ? (
              <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
                {t(locale, "login.billingOk")}
              </p>
            ) : null}
            {query.billing === "pending" ? (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                {t(locale, "login.billingPending")}
              </p>
            ) : null}
            {query.paused ? (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                {t(locale, "login.pausedBanner")}
              </p>
            ) : null}
            {userCount === 0 ? (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                {t(locale, "login.noUsers")}{" "}
                <Link href="/signup" className="font-semibold underline">
                  {t(locale, "login.createFirst")}
                </Link>{" "}
                {t(locale, "login.createFirstAfter")}
              </p>
            ) : null}
            <ActionForm action={loginAction} className="mt-6 space-y-4">
              <label className="block text-sm font-medium">
                {t(locale, "login.email")}
                <AuthEmailInput />
              </label>
              <label className="block text-sm font-medium">
                {t(locale, "login.password")}
                <input
                  name="password"
                  type="password"
                  required
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </label>
              <button className="w-full rounded-lg bg-emerald-800 px-4 py-2.5 font-semibold text-white hover:bg-emerald-700">
                {t(locale, "login.signIn")}
              </button>
            </ActionForm>
            <p className="mt-3 text-sm">
              <Link href="/forgot" className="font-medium text-emerald-800 hover:underline">
                {t(locale, "login.forgot")}
              </Link>
            </p>
            <p className="mt-4 text-sm text-stone-600">
              {t(locale, "login.newCompany")}{" "}
              <Link href="/signup" className="font-medium text-emerald-800 hover:underline">
                {t(locale, "login.createAccount")}
              </Link>
            </p>
            <p className="mt-2 text-sm text-stone-600">{t(locale, "login.inviteHint")}</p>
            {showDemo ? (
              <div className="mt-6 rounded-lg bg-stone-50 p-3 text-xs text-stone-600">
                <p className="font-semibold text-stone-800">Demo (password: demo1234)</p>
                <p>Admin: admin@heartland.ag</p>
                <p>Manager: manager@heartland.ag</p>
                <p>Technician: mike@heartland.ag</p>
                <p>Customer: tom@greenacres.farm</p>
                <p>Second tenant admin: admin@prairie.ag</p>
                <p className="mt-2 font-semibold text-stone-800">Marketing demo (same password)</p>
                <p>High Plains Irrigation admin: admin@highplains.ag</p>
                <p>Manager: manager@highplains.ag · Tech: carlos@highplains.ag</p>
                <p>Customer: amy@willowbend.farm</p>
              </div>
            ) : null}
          </div>
        </AuthBrandProvider>
      </div>
    </div>
    </I18nProvider>
  );
}
