import Link from "next/link";
import { logoutAction } from "@/lib/actions";
import { roleLabel } from "@/lib/scope";
import type { SessionUser } from "@/lib/auth";
import { isShopStaff, ROLES } from "@/lib/roles";
import { homePath } from "@/lib/home";
import { NavDropdown } from "@/components/NavDropdown";
import { NavLinkMenu } from "@/components/NavLinkMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { assetTypeHref } from "@/lib/assets";

export function Nav({
  session,
  hasLogo,
  assetTypes = [],
  showMaps = true,
  showGps = true,
}: {
  session: SessionUser;
  hasLogo?: boolean;
  assetTypes?: { name: string; slug: string }[];
  showMaps?: boolean;
  showGps?: boolean;
}) {
  const farmer = session.role === ROLES.FARMER;
  const beforeTickets = farmer
    ? [{ href: "/dashboard", label: "Dashboard" }]
    : [{ href: "/dispatch", label: "Dispatch" }];
  const ticketLinks = [
    { href: "/tickets", label: "All work orders" },
    ...(showMaps ? [{ href: "/map", label: "Work order map" }] : []),
    { href: "/startup", label: "Maintenance" },
    ...(!farmer
      ? [
          { href: "/parts", label: "Parts" },
          { href: "/labor", label: "Labor" },
          { href: "/equipment", label: "Equipment" },
        ]
      : []),
  ];
  const reportLinks = [
    { href: "/reports", label: "Work order reports" },
    { href: "/reports/pivots", label: "Pivot reports" },
    { href: "/reports/customers", label: "Customer reports" },
    { href: "/reports/farms", label: "Farm reports" },
    { href: "/reports/assets", label: "Asset reports" },
  ];
  const customerLinks = !farmer
    ? [
        { href: "/farmers", label: "Customers (all)" },
        { href: "/farms", label: "Farms" },
      ]
    : [];
  const assetLinks = [
    { href: "/assets", label: "All Assets" },
    ...assetTypes.map((type) => ({ href: assetTypeHref(type), label: type.name })),
    ...(isShopStaff(session.role) ? [{ href: "/assets/types", label: "Manage types" }] : []),
  ];

  const staffMenu = {
    href: "/staff",
    label: "Staff",
    children: [
      { href: "/technicians", label: "Technicians" },
      { href: "/managers", label: "Managers" },
    ],
  };
  const deskSettings = { href: "/settings", label: "Dispatch view" };
  const settingsLinks =
    session.role === ROLES.ADMIN
      ? [
          deskSettings,
          staffMenu,
          { href: "/online", label: "Who’s signed in" },
          { href: "/stores", label: "Stores" },
          { href: "/company", label: "Logo" },
          { href: "/startup/checklist", label: "Maintenance checklist" },
          { href: "/sms", label: "SMS" },
          ...(showGps
            ? [
                { href: "/reveal", label: "Connectors" },
                { href: "/vehicles", label: "Vehicles" },
              ]
            : []),
        ]
      : session.role === ROLES.MANAGER
        ? [deskSettings, staffMenu, ...(showGps ? [{ href: "/vehicles", label: "Vehicles" }] : [])]
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
          <NavDropdown label="Work orders" links={ticketLinks} />
          <NavLinkMenu href="/assets" label="Assets" links={assetLinks} />
          <NavLinkMenu href="/reports" label="Reports" links={reportLinks} />
          {customerLinks.length ? (
            <NavLinkMenu href="/farmers" label="Customers" links={customerLinks} />
          ) : null}
          {settingsLinks.length ? <NavDropdown label="Settings" links={settingsLinks} /> : null}
          <NavLinkMenu
            href="/help"
            label="Support"
            links={[
              { href: "/help", label: "Support" },
              { href: "/help/faq", label: "FAQ" },
            ]}
          />
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <ThemeToggle variant="nav" />
          <div className="text-right">
            <p className="font-medium">{session.name}</p>
            <p className="text-xs text-emerald-200">{roleLabel(session.role)}</p>
          </div>
          <form action={logoutAction}>
            <button className="rounded-md border border-emerald-700 px-3 py-1.5 text-xs hover:bg-emerald-900">
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
