import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canEditDeskSettings, isAdmin } from "@/lib/roles";
import { homePath } from "@/lib/home";
import { loadUserDispatchView } from "@/lib/dispatch-view";
import { saveDispatchViewAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguagePicker } from "@/components/LanguagePicker";
import { getRequestLocale } from "@/lib/user-locale";
import { t } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { ensureQbwcConfig } from "@/lib/qbwc";
import { QbwcSetup } from "@/components/QbwcSetup";

export default async function DeskSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canEditDeskSettings(session.role)) redirect(homePath(session.role));

  const [dispatchView, locale, qbwc] = await Promise.all([
    loadUserDispatchView(session.userId),
    getRequestLocale(),
    isAdmin(session.role) ? ensureQbwcConfig(session.organizationId) : Promise.resolve(null),
  ]);
  const queuedCount = qbwc
    ? await prisma.qbEstimateJob.count({
        where: { organizationId: session.organizationId, status: "QUEUED" },
      })
    : 0;

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-3xl">{t(locale, "settings.title")}</h1>
      <p className="mt-2 text-stone-600">{t(locale, "settings.intro")}</p>
      <div className="mt-6 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
        <p className="text-sm font-medium">{t(locale, "lang.label")}</p>
        <p className="text-sm text-stone-600">{t(locale, "lang.help")}</p>
        <p className="text-sm font-semibold">{locale === "es" ? t(locale, "lang.es") : t(locale, "lang.en")}</p>
        <LanguagePicker locale={locale} variant="panel" />
      </div>
      <div className="mt-6 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
        <p className="text-sm font-medium">{t(locale, "settings.appearance")}</p>
        <p className="text-sm text-stone-600">{t(locale, "settings.appearanceHelp")}</p>
        <ThemeToggle />
      </div>
      <ActionForm action={saveDispatchViewAction} className="mt-6 space-y-4 rounded-xl border border-stone-200 bg-white p-4">
        <p className="text-sm font-medium">{t(locale, "settings.dispatchView")}</p>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-stone-200 p-3 has-[:checked]:border-emerald-800 has-[:checked]:bg-emerald-50">
          <input
            type="radio"
            name="dispatchView"
            value="LIST"
            defaultChecked={dispatchView === "LIST"}
            className="mt-1 size-4 border-stone-300 text-emerald-800"
          />
          <span>
            <span className="block text-sm font-semibold">{t(locale, "settings.listView")}</span>
            <span className="mt-0.5 block text-sm text-stone-600">{t(locale, "settings.listHelp")}</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-stone-200 p-3 has-[:checked]:border-emerald-800 has-[:checked]:bg-emerald-50">
          <input
            type="radio"
            name="dispatchView"
            value="TILES"
            defaultChecked={dispatchView === "TILES"}
            className="mt-1 size-4 border-stone-300 text-emerald-800"
          />
          <span>
            <span className="block text-sm font-semibold">{t(locale, "settings.tilesView")}</span>
            <span className="mt-0.5 block text-sm text-stone-600">{t(locale, "settings.tilesHelp")}</span>
          </span>
        </label>
        <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">{t(locale, "common.save")}</button>
      </ActionForm>
      {qbwc ? (
        <div className="mt-6">
          <QbwcSetup
            username={qbwc.username}
            hasPassword={Boolean(qbwc.passwordHash)}
            companyName={qbwc.companyName}
            lastError={qbwc.lastError}
            lastSyncAt={qbwc.lastSyncAt}
            queuedCount={queuedCount}
          />
        </div>
      ) : null}
    </div>
  );
}
