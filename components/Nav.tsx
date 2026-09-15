import Link from "next/link";
import { logoutAction } from "@/lib/actions";
import { roleLabel } from "@/lib/scope";
import type { SessionUser } from "@/lib/auth";
import { ROLES } from "@/lib/roles";

export function Nav({ session }: { session: SessionUser }) {
  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dispatch", label: "Dispatch" },
    { href: "/tickets", label: "Tickets" },
    { href: "/startup", label: "Startup" },
    { href: "/pivots", label: "Pivots" },
    { href: "/map", label: "Ticket map" },
  ];
  if (session.role === ROLES.FARMER) {
    links.splice(1, 1);
  }
  if (session.role === ROLES.ADMIN) {
    links.push({ href: "/parts", label: "Parts" });
    links.push({ href: "/farmers", label: "Farms" });
    links.push({ href: "/technicians", label: "Technicians" });
    links.push({ href: "/managers", label: "Managers" });
    links.push({ href: "/staff", label: "Staff" });
    links.push({ href: "/reveal", label: "Reveal GPS" });
    links.push({ href: "/sms", label: "SMS" });
  } else if (session.role === ROLES.MANAGER) {
    links.push({ href: "/parts", label: "Parts" });
    links.push({ href: "/farmers", label: "Farms" });
    links.push({ href: "/technicians", label: "Technicians" });
  } else if (session.role === ROLES.TECHNICIAN) {
    links.push({ href: "/parts", label: "Parts" });
    links.push({ href: "/farmers", label: "Farms" });
  }

  return (
    <header className="no-print border-b border-emerald-950/20 bg-emerald-950 text-emerald-50">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/dashboard" className="font-display text-lg tracking-tight">
          AG Service Desk
        </Link>
        <nav className="flex max-w-3xl flex-wrap items-center gap-4 text-sm">
          {links.map((link) => (
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
