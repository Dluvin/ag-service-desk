import Link from "next/link";
import { logoutAction } from "@/lib/actions";
import { roleLabel } from "@/lib/scope";
import type { SessionUser } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { NavDropdown } from "@/components/NavDropdown";

export function Nav({
  session,
  companyName,
  hasLogo,
}: {
  session: SessionUser;
  companyName?: string;
  hasLogo?: boolean;
}) {
  const farmer = session.role === ROLES.FARMER;
  const beforeTickets = [
    { href: "/dashboard", label: "Dashboard" },
    ...(!farmer ? [{ href: "/dispatch", label: "Dispatch" }] : []),
  ];
  const ticketLinks = [
    { href: "/tickets", label: "All tickets" },
    { href: "/map", label: "Ticket map" },
    { href: "/startup", label: "Maintenance" },
  ];
  const afterTickets = [
    { href: "/reports", label: "Reports" },
    { href: "/pivots", label: "Pivots" },
    ...(!farmer
      ? [
          { href: "/parts", label: "Parts" },
          { href: "/labor", label: "Labor" },
          { href: "/farmers", label: "Farms" },
        ]
      : []),
  ];

  const adminLinks =
    session.role === ROLES.ADMIN
      ? [
          { href: "/technicians", label: "Technicians" },
          { href: "/managers", label: "Managers" },
          { href: "/staff", label: "Staff" },
          { href: "/stores", label: "Stores" },
          { href: "/company", label: "Logo" },
          { href: "/startup/checklist", label: "Maintenance checklist" },
          { href: "/sms", label: "SMS" },
          { href: "/reveal", label: "Reveal GPS" },
        ]
      : [];

  const managerLinks =
    session.role === ROLES.MANAGER ? [{ href: "/technicians", label: "Technicians" }] : [];

  return (
    <header className="no-print relative z-50 border-b border-emerald-950/20 bg-emerald-950 text-emerald-50">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2 font-display text-lg tracking-tight">
          {hasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/api/company-logo" alt="" className="h-8 max-w-40 object-contain" />
          ) : null}
          <span>{companyName || "AG Service Desk"}</span>
        </Link>
        <nav className="flex max-w-3xl flex-wrap items-center gap-4 text-sm">
          {beforeTickets.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-white">
              {link.label}
            </Link>
          ))}
          <NavDropdown label="Tickets" links={ticketLinks} />
          {afterTickets.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-white">
              {link.label}
            </Link>
          ))}
          {adminLinks.length ? <NavDropdown label="Admin" links={adminLinks} /> : null}
          {managerLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <div className="text-right">
            <p className="font-medium">{session.name}</p>
            <p className="text-xs text-emerald-200">
              {session.organizationName} · {roleLabel(session.role)}
            </p>
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
