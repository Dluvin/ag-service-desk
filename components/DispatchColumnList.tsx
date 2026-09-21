"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

const VISIBLE_CARDS = 3;

export function DispatchColumnList({
  children,
  count,
}: {
  children: ReactNode;
  count: number;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const [maxHeight, setMaxHeight] = useState<number | undefined>();

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    function measure() {
      const el = listRef.current;
      if (!el) return;
      const cards = Array.from(el.children) as HTMLElement[];
      if (cards.length <= VISIBLE_CARDS) {
        setMaxHeight(undefined);
        return;
      }
      const first = cards[0];
      const lastVisible = cards[VISIBLE_CARDS - 1];
      if (!first || !lastVisible) {
        setMaxHeight(undefined);
        return;
      }
      setMaxHeight(lastVisible.offsetTop + lastVisible.offsetHeight - first.offsetTop);
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    for (const card of Array.from(list.children)) {
      observer.observe(card);
    }
    return () => observer.disconnect();
  }, [count]);

  return (
    <ul
      ref={listRef}
      className="max-h-[40rem] space-y-2 overflow-y-auto overscroll-contain"
      style={maxHeight != null ? { maxHeight } : undefined}
    >
      {children}
    </ul>
  );
}
