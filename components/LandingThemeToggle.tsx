"use client";

import { useEffect, useState } from "react";

export function LandingThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-landing-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-landing-theme");
    }
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
