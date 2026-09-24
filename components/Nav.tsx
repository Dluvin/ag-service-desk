import Link from "next/link";
import { logoutAction } from "@/lib/actions";
import { roleLabel } from "@/lib/scope";
import type { SessionUser } from "@/lib/auth";
import { isShopStaff, ROLES } from "@/lib/roles";
import { homePath } from "@/lib/home";
import { NavDropdown } from "@/components/NavDropdown";
import { NavLinkMenu } from "@/components/NavLinkMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguagePicker } from "@/components/LanguagePicker";
import { assetTypeHref } from "@/lib/assets";
import { t, type Locale } from "@/lib/i18n";

export function Nav({
  session,
  locale,
  hasLogo,
  assetTypes = [],
  showMaps = true,
  showGps = true,
}: {
  session: SessionUser;
  locale: Locale;
  hasLogo?: boolean;
  assetTypes?: { name: string; slug: string }[];
  showMaps?: boolean;
  showGps?: boolean;
}) {
  const farmer = session.role === ROLES.FARMER;
  const beforeTickets = farmer
    ? [{ href: "/dashboard", label: t(locale, "nav.dashboard") }]
    : [{ href: "/dispatch", label: t(locale, "nav.dispatch") }];
  const ticketLinks = [
    { href: "/tickets", label: t(locale, "nav.allWorkOrders") },
    ...(showMaps ? [{ href: "/map", label: t(locale, "nav.workOrderMap") }] : []),
    { href: "/startup", label: t(locale, "nav.maintenance") },
    ...(!farmer
      ? [
          { href: "/parts", label: t(locale, "nav.parts") },
          { href: "/labor", label: t(locale, "nav.labor") },
          { href: "/equipment", label: t(locale, "nav.equipment") },
        ]
      : []),
  ];
  const reportLinks = [
    { href: "/reports", label: t(locale, "nav.woReports") },
    { href: "/reports/pivots", label: t(locale, "nav.pivotReports") },
    { href: "/reports/customers", label: t(locale, "nav.customerReports") },
    { href: "/reports/farms", label: t(locale, "nav.farmReports") },
    { href: "/reports/assets", label: t(locale, "nav.assetReports") },
  ];
  const customerLinks = !farmer
    ? [
        { href: "/farmers", label: t(locale, "nav.customersAll") },
        { href: "/farms", label: t(locale, "nav.farms") },
      ]
    : [];
  const assetLinks = [
    { href: "/assets", label: t(locale, "nav.allAssets") },
    ...assetTypes.map((type) => ({ href: assetTypeHref(type), label: type.name })),
    ...(isShopStaff(session.role) ? [{ href: "/assets/types", label: t(locale, "nav.manageTypes") }] : []),
  ];

  const staffMenu = {
    href: "/staff",
    label: t(locale, "nav.staff"),
    children: [
      { href: "/technicians", label: t(locale, "nav.technicians") },
      { href: "/managers", label: t(locale, "nav.managers") },
    ],
  };
  const deskSettings = { href: "/settings", label: t(locale, "nav.dispatchView") };
  const settingsLinks =
    session.role === ROLES.ADMIN
      ? [
          deskSettings,
          staffMenu,
          { href: "/online", label: t(locale, "nav.online") },
          { href: "/stores", label: t(locale, "nav.stores") },
          { href: "/company", label: t(locale, "nav.logo") },
          { href: "/startup/checklist", label: t(locale, "nav.checklist") },
          { href: "/sms", label: t(locale, "nav.sms") },
          ...(showGps
            ? [
                { href: "/reveal", label: t(locale, "nav.connectors") },
                { href: "/vehicles", label: t(locale, "nav.vehicles") },
              ]
            : []),
        ]
      : session.role === ROLES.MANAGER
        ? [deskSettings, staffMenu, ...(showGps ? [{ href: "/vehicles", label: t(locale, "nav.vehicles") }] : [])]
        : session.role === ROLES.CLERICAL
          ? [deskSettings]
          : [];

  return (
    <header className="no-print relative z-50 border-b border-emerald-950/20 bg-emerald-950 text-emerald-50">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href={homePath(session.role)} className="flex items-center gap-2 font-display text-lg tracking-tight">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand-logo-on-dark.png" alt="AG Desk Pro" className="h-9 max-w-52 bg-transparent object-contain object-left" />
          {hasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/api/company-logo" alt="" className="h-8 max-w-32 object-contain" />
          ) : null}
        </Link>
        <nav className="flex max-w-3xl flex-wrap items-center gap-4 text-sm">
          {beforeTickets.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-white">
              {link.label}
            </Link>
          ))}
          <NavDropdown label={t(locale, "nav.workOrders")} links={ticketLinks} />
          <NavLinkMenu href="/assets" label={t(locale, "nav.assets")} links={assetLinks} />
          <NavLinkMenu href="/reports" label={t(locale, "nav.reports")} links={reportLinks} />
          {customerLinks.length ? (
            <NavLinkMenu href="/farmers" label={t(locale, "nav.customers")} links={customerLinks} />
          ) : null}
          {settingsLinks.length ? <NavDropdown label={t(locale, "nav.settings")} links={settingsLinks} /> : null}
          <NavLinkMenu
            href="/help"
            label={t(locale, "nav.support")}
            links={[
              { href: "/help", label: t(locale, "nav.support") },
              { href: "/help/faq", label: t(locale, "nav.faq") },
            ]}
          />
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <LanguagePicker locale={locale} variant="nav" />
          <ThemeToggle variant="nav" />
          <div className="text-right">
            <p className="font-medium">{session.name}</p>
            <p className="text-xs text-emerald-200">{roleLabel(session.role, locale)}</p>
          </div>
          <form action={logoutAction}>
            <button className="rounded-md border border-emerald-700 px-3 py-1.5 text-xs hover:bg-emerald-900">
              {t(locale, "nav.logOut")}
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
