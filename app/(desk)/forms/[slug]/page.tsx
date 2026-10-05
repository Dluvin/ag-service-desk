import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession, type SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FINISHED_STATUSES, isShopStaff } from "@/lib/roles";
import { assetWhere, pivotWhere, ticketWhere } from "@/lib/scope";
import { ensureAssetTypes } from "@/lib/assets";
import { AGSENSE_LOGO_SRC, officeFormBySlug } from "@/lib/office-forms";
import { OfficeFormDocument } from "@/components/office-forms/OfficeFormDocument";
import { getRequestLocale } from "@/lib/user-locale";
import { t } from "@/lib/i18n";
import { orgFormsIsOn } from "@/lib/ocr-samples";
import { ticketSiteName } from "@/lib/ticket-site";

async function serviceTicketSite(session: SessionUser) {
  const [pivots, assets, types, farmers] = await Promise.all([
    prisma.pivot.findMany({
      where: pivotWhere(session),
      include: { farmer: true },
      orderBy: { name: "asc" },
    }),
    prisma.asset.findMany({
      where: assetWhere(session),
      include: { farmer: true, assetType: true },
      orderBy: { name: "asc" },
    }),
    ensureAssetTypes(session.organizationId),
    prisma.farmer.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return {
    pivots: pivots.map((pivot) => ({
      id: pivot.id,
      name: pivot.name,
      farmerName: pivot.farmer.name,
      farmerId: pivot.farmerId,
      latitude: pivot.latitude,
      longitude: pivot.longitude,
      locationNote: pivot.locationNote,
    })),
    assets: assets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      farmerName: asset.farmer.name,
      farmerId: asset.farmerId,
      latitude: asset.latitude,
      longitude: asset.longitude,
      locationNote: asset.locationNote,
      typeSlug: asset.assetType.slug,
    })),
    types: types.map((type) => ({
      id: type.id,
      name: type.name,
      slug: type.slug,
      kind: type.kind,
    })),
    farmers,
    mapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || undefined,
  };
}

export default async function OfficeFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isShopStaff(session.role)) notFound();
  const { slug } = await params;
  const form = officeFormBySlug(slug);
  if (!form) notFound();
  const locale = await getRequestLocale();
  if (!(await orgFormsIsOn(session.organizationId))) {
    return (
      <div className="max-w-xl">
        <h1 className="font-display text-3xl">{t(locale, "forms.title")}</h1>
        <p className="mt-2 text-stone-600">{t(locale, "forms.notEnabled")}</p>
      </div>
    );
  }

  const [org, tickets, createSite] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: session.organizationId },
      select: { name: true, logoMimeType: true },
    }),
    prisma.ticket.findMany({
      where: {
        ...ticketWhere(session),
        status: { notIn: FINISHED_STATUSES },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: {
        id: true,
        number: true,
        title: true,
        status: true,
        farmer: { select: { name: true } },
        pivot: { select: { name: true } },
        asset: { select: { name: true, assetType: { select: { name: true } } } },
      },
    }),
    form.slug === "service-ticket" ? serviceTicketSite(session) : Promise.resolve(null),
  ]);

  const dealerLogo = org?.logoMimeType ? "/api/company-logo" : null;
  const logoSrc = form.logo === "agsense" ? AGSENSE_LOGO_SRC : dealerLogo;
  const logoAlt = form.logo === "agsense" ? "AgSense" : (org?.name ?? session.organizationName);

  return (
    <div>
      <div className="no-print mb-4">
        <Link href="/forms" className="text-sm text-emerald-800 hover:underline">
          {t(locale, "forms.back")}
        </Link>
      </div>
      <OfficeFormDocument
        slug={form.slug}
        title={t(locale, form.titleKey)}
        orgName={org?.name ?? session.organizationName}
        logoSrc={logoSrc}
        logoAlt={logoAlt}
        openTickets={tickets.map((ticket) => ({
          id: ticket.id,
          number: ticket.number,
          title: ticket.title,
          farmerName: ticket.farmer.name,
          pivotName: ticketSiteName(ticket),
          status: ticket.status,
        }))}
        createSite={createSite ?? undefined}
      />
    </div>
  );
}
