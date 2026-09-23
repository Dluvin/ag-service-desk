"use client";

import { useEffect, useState } from "react";
import { applyDeskTheme, DESK_THEME_KEY, resolveDeskTheme, type DeskTheme } from "@/lib/theme";

export function ThemeToggle({
  variant = "panel",
}: {
  variant?: "nav" | "panel";
}) {
  const [theme, setTheme] = useState<DeskTheme | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      const next = resolveDeskTheme(localStorage.getItem(DESK_THEME_KEY), media.matches);
      applyDeskTheme(next);
      setTheme(next);
    };
    sync();
    const onStorage = (event: StorageEvent) => {
      if (event.key === DESK_THEME_KEY || event.key === null) sync();
    };
    media.addEventListener("change", sync);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  function toggle() {
    const next: DeskTheme = theme === "dark" ? "light" : "dark";
    localStorage.setItem(DESK_THEME_KEY, next);
    applyDeskTheme(next);
    setTheme(next);
  }

  const label = theme === "dark" ? "Light mode" : "Dark mode";
  const className =
    variant === "nav"
      ? "rounded-md border border-emerald-700 px-3 py-1.5 text-xs hover:bg-emerald-900"
      : "rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-800 hover:bg-stone-50";

  return (
    <button type="button" className={className} aria-label={label} onClick={toggle}>
      {theme ? label : "Theme"}
    </button>
  );
}
