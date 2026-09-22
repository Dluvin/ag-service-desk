import { redirect } from "next/navigation";
import { destroySession, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Nav } from "@/components/Nav";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { TrialBanner } from "@/components/TrialBanner";
import { PlanProvider } from "@/components/PlanProvider";
import { ensureAssetTypes } from "@/lib/assets";
import { PLAN_ORG_SELECT, resolveEntitlements } from "@/lib/plans";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const org = await prisma.organization.findUnique({
    where: { id: session.organizationId },
    select: { name: true, logoMimeType: true, paused: true, trialEndsAt: true, ...PLAN_ORG_SELECT },
  });
  if (!org) {
    await destroySession();
    redirect("/login");
  }
  if (org.paused && !session.impersonatorId) {
    await destroySession();
    redirect("/login?paused=1");
  }

  const entitlements = resolveEntitlements(org);
  const assetTypes = await ensureAssetTypes(session.organizationId);

  return (
    <PlanProvider value={entitlements}>
      <div className="min-h-full">
        {session.impersonatorId ? <ImpersonationBanner companyName={org.name} /> : null}
        {org.trialEndsAt && org.trialEndsAt.getTime() > Date.now() - 24 * 60 * 60 * 1000 ? (
          <TrialBanner trialEndsAt={org.trialEndsAt} />
        ) : null}
        <Nav
          session={session}
          hasLogo={Boolean(org?.logoMimeType)}
          assetTypes={assetTypes.map((type) => ({ name: type.name, slug: type.slug }))}
          showMaps={entitlements.mapsEnabled}
          showGps={entitlements.gpsEnabled}
        />
        <main className="mx-auto max-w-7xl px-4 py-8 print:max-w-none print:px-0 print:py-0">{children}</main>
      </div>
    </PlanProvider>
  );
}
