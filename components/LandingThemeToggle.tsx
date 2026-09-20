"use client";

import { useEffect, useState } from "react";

export function LandingThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(dark ? "dark" : "light");
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-landing-theme", theme);
  }, [theme]);

  return (
    <button
      className="landing-toggle"
      type="button"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
