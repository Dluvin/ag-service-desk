"use client";

import { useState } from "react";
import Link from "next/link";

export function NavLinkMenu({
  href,
  label,
  links,
}: {
  href: string;
  label: string;
  links: { href: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="group relative" onMouseLeave={() => setOpen(false)}>
      <Link
        href={href}
        className="hover:text-white"
        onMouseEnter={() => setOpen(true)}
        onFocus={() => setOpen(true)}
      >
        {label}
      </Link>
      {links.length ? (
        <div
          role="menu"
          className={`absolute left-0 z-50 pt-2 ${
            open ? "visible opacity-100" : "invisible opacity-0"
          } group-hover:visible group-hover:opacity-100`}
        >
          <div className="min-w-44 rounded-lg border border-emerald-800 bg-emerald-950 py-1 shadow-lg">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-3 py-2 text-sm hover:bg-emerald-900 hover:text-white"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
