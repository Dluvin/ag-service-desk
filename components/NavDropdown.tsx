"use client";

import { useState } from "react";
import Link from "next/link";

export type NavItem = {
  href: string;
  label: string;
  children?: { href: string; label: string }[];
};

export function NavDropdown({
  label,
  links,
}: {
  label: string;
  links: NavItem[];
}) {
  const [open, setOpen] = useState(false);

  if (!links.length) return null;

  return (
    <div className="group relative" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="hover:text-white"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        {label}
      </button>
      <div
        role="menu"
        className={`absolute left-0 z-50 pt-2 ${
          open ? "visible opacity-100" : "invisible opacity-0"
        } group-hover:visible group-hover:opacity-100`}
      >
        <div className="min-w-44 rounded-lg border border-emerald-800 bg-emerald-950 py-1 shadow-lg">
          {links.map((link) =>
            link.children?.length ? (
              <div key={link.href} className="group/sub relative">
                <Link
                  href={link.href}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-emerald-900 hover:text-white"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                  <span aria-hidden className="text-xs text-emerald-300">
                    ▸
                  </span>
                </Link>
                <div className="invisible absolute right-full top-0 z-[60] pr-1 opacity-0 group-hover/sub:visible group-hover/sub:opacity-100">
                  <div className="min-w-44 rounded-lg border border-emerald-800 bg-emerald-950 py-1 shadow-lg">
                    {link.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block px-3 py-2 text-sm hover:bg-emerald-900 hover:text-white"
                        onClick={() => setOpen(false)}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="block px-3 py-2 text-sm hover:bg-emerald-900 hover:text-white"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
