import { DESK_THEME_INIT } from "@/lib/theme";

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: DESK_THEME_INIT }} />;
}
