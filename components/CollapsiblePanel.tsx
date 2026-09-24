"use client";

import { useState, type ReactNode } from "react";

export function CollapsiblePanel({
  title,
  hideLabel,
  countLabel,
  defaultOpen = false,
  children,
}: {
  title: string;
  hideLabel?: string;
  countLabel?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-4">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-100"
      >
        {open ? hideLabel ?? title : title}
        {countLabel && !open ? ` · ${countLabel}` : ""}
      </button>
      {open ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}
