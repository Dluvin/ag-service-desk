import { redirect } from "next/navigation";
import { OcrOnboardingChecklist } from "@/components/OcrOnboardingChecklist";
import { TicketFormSettings } from "@/components/TicketFormSettings";
import { getSession } from "@/lib/auth";
import { loadOrgOcrSettings } from "@/lib/ocr-samples";
import { isAdmin } from "@/lib/roles";
import { getRequestLocale } from "@/lib/user-locale";

export default async function TicketFormPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isAdmin(session.role)) redirect("/dashboard");

  const locale = await getRequestLocale();
  const settings = await loadOrgOcrSettings(session.organizationId);

  return (
    <div className="max-w-xl space-y-8">
      <OcrOnboardingChecklist
        locale={locale}
        ocrOn={settings.ocrOn}
        sampleCount={settings.samples.length}
        boxesConfirmed={Boolean(settings.boxesConfirmedAt)}
        firstScan={Boolean(settings.firstScanAt)}
        fieldListReviewed={Boolean(settings.fieldListReviewedAt)}
      />
      <TicketFormSettings
        templateKey={settings.templateKey}
        fieldNotes={settings.fieldNotes}
        samples={settings.samples}
      />
    </div>
  );
}
