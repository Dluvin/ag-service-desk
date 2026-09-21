import Link from "next/link";
import type { ReactNode } from "react";
import { PriorityBadge } from "@/components/Badges";

export function DispatchWorkOrderCard({
  href,
  title,
  priority,
  children,
}: {
  href: string;
  title: string;
  priority: string;
  children: ReactNode;
}) {
  return (
    <li className="group rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={href}
          className="min-w-0 truncate font-medium text-emerald-950 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
        >
          {title}
        </Link>
        <PriorityBadge priority={priority} />
      </div>
      <div className="hidden group-hover:block group-focus-within:block">{children}</div>
    </li>
  );
}
