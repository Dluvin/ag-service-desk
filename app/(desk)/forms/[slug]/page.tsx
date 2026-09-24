import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FINISHED_STATUSES, isShopStaff } from "@/lib/roles";
import { ticketWhere } from "@/lib/scope";
import { AGSENSE_LOGO_SRC, officeFormBySlug } from "@/lib/office-forms";
import { OfficeFormDocument } from "@/components/office-forms/OfficeFormDocument";
import { getRequestLocale } from "@/lib/user-locale";
import { t } from "@/lib/i18n";
import { orgFormsIsOn } from "@/lib/ocr-samples";

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

  const [org, tickets] = await Promise.all([
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
      },
    }),
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
          pivotName: ticket.pivot.name,
          status: ticket.status,
        }))}
      />
    </div>
  );
}
