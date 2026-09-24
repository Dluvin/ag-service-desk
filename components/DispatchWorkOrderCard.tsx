"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { PriorityBadge, StatusBadge } from "@/components/Badges";

export function DispatchWorkOrderCard({
  href,
  number,
  title,
  customer,
  priority,
  status,
  variant = "list",
  children,
}: {
  href: string;
  number: number;
  title: string;
  customer: string;
  priority: string;
  status: string;
  variant?: "list" | "tile";
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const details = (
    <div className={expanded ? "block" : "hidden group-hover:block group-focus-within:block"}>
      {variant === "tile" ? <p className="mt-2 text-sm font-medium text-stone-800">{title}</p> : null}
      {children}
    </div>
  );
  const detailsButton = (
    <button
      type="button"
      aria-expanded={expanded}
      onClick={() => setExpanded((open) => !open)}
      className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900"
    >
      {expanded ? "Hide" : "Details"}
    </button>
  );

  if (variant === "tile") {
    return (
      <li className="group rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={href}
            className="min-w-0 truncate font-medium text-emerald-950 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            #{number}
            <span className="sr-only"> {title}</span>
          </Link>
          <PriorityBadge priority={priority} />
        </div>
        <p className="mt-1 truncate text-xs text-stone-600">{customer}</p>
        <div className="mt-1">{detailsButton}</div>
        {details}
      </li>
    );
  }

  return (
    <li className="group rounded-lg border border-stone-200 bg-white px-3 py-2 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex min-w-0 items-start gap-2 sm:contents">
          <PriorityBadge priority={priority} />
          <Link
            href={href}
            className="min-w-0 flex-1 font-medium text-emerald-950 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 sm:flex sm:items-baseline sm:gap-1"
          >
            <span className="shrink-0 whitespace-nowrap">#{number}</span>
            <span className="mt-0.5 block truncate sm:mt-0 sm:min-w-0 sm:flex-1">{title}</span>
          </Link>
          <span className="shrink-0 sm:hidden">{detailsButton}</span>
        </div>
        <p className="min-w-0 truncate text-sm text-stone-600 sm:max-w-[14rem]">{customer}</p>
        <StatusBadge status={status} />
        <span className="hidden shrink-0 sm:inline-flex">{detailsButton}</span>
      </div>
      {details}
    </li>
  );
}
