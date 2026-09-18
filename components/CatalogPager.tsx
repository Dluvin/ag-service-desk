import Link from "next/link";
import type { ReactNode } from "react";

export function CatalogPager({
  action,
  query,
  page,
  pageCount,
}: {
  action: string;
  query: string;
  page: number;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;

  const href = (target: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs ? `${action}?${qs}` : action;
  };

  const previous = Math.max(1, page - 1);
  const next = Math.min(pageCount, page + 1);

  return (
    <nav className="mt-4 flex flex-wrap items-center gap-1.5 text-sm" aria-label="Catalog pages">
      <PageLink href={href(1)} disabled={page === 1}>
        First
      </PageLink>
      <PageLink href={href(previous)} disabled={page === 1}>
        Previous
      </PageLink>
      {pageList(page, pageCount).map((item, index) =>
        item === "gap" ? (
          <span key={`gap-${index}`} className="px-1 text-stone-400">
            …
          </span>
        ) : (
          <PageLink key={item} href={href(item)} current={item === page}>
            {item}
          </PageLink>
        ),
      )}
      <PageLink href={href(next)} disabled={page === pageCount}>
        Next
      </PageLink>
      <PageLink href={href(pageCount)} disabled={page === pageCount}>
        End
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  children,
  disabled,
  current,
}: {
  href: string;
  children: ReactNode;
  disabled?: boolean;
  current?: boolean;
}) {
  if (disabled) {
    return (
      <span className="rounded-md border border-stone-200 px-2.5 py-1 text-stone-400">{children}</span>
    );
  }
  if (current) {
    return (
      <span className="rounded-md bg-emerald-800 px-2.5 py-1 font-semibold text-white">{children}</span>
    );
  }
  return (
    <Link href={href} className="rounded-md border border-stone-300 bg-white px-2.5 py-1 hover:bg-stone-50">
      {children}
    </Link>
  );
}

function pageList(current: number, last: number): Array<number | "gap"> {
  if (last <= 7) return Array.from({ length: last }, (_, index) => index + 1);
  const start = Math.max(2, current - 1);
  const end = Math.min(last - 1, current + 1);
  const pages: Array<number | "gap"> = [1];
  if (start > 2) pages.push("gap");
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < last - 1) pages.push("gap");
  pages.push(last);
  return pages;
}
