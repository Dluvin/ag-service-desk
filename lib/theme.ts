export const DESK_THEME_KEY = "ag-desk-theme";

export type DeskTheme = "light" | "dark";

export function isDeskTheme(value: string | null | undefined): value is DeskTheme {
  return value === "light" || value === "dark";
}

export function resolveDeskTheme(stored: string | null | undefined, prefersDark: boolean): DeskTheme {
  return isDeskTheme(stored) ? stored : prefersDark ? "dark" : "light";
}

export function applyDeskTheme(theme: DeskTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export const DESK_THEME_INIT = `(function(){try{var k=${JSON.stringify(DESK_THEME_KEY)};var s=localStorage.getItem(k);var d=window.matchMedia("(prefers-color-scheme: dark)").matches;var t=s==="light"||s==="dark"?s:d?"dark":"light";var r=document.documentElement;r.classList.toggle("dark",t==="dark");r.style.colorScheme=t;}catch(e){}})();`;
