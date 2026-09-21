import Link from "next/link";
import { platformLogoutAction } from "@/lib/platform-actions";
import type { PlatformSession } from "@/lib/platform";

export function PlatformHeader({ session }: { session: PlatformSession }) {
  return (
    <header className="border-b border-stone-800 bg-stone-900 text-stone-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/platform">
          <p className="text-xs uppercase tracking-wider text-amber-300">Super admin</p>
          <p className="font-display text-lg">Tenant portal</p>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/signup" className="rounded-md border border-amber-400/40 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-stone-800">
            Start a company
          </Link>
          <p className="text-stone-300">{session.name}</p>
          <form action={platformLogoutAction}>
            <button className="rounded-md border border-stone-600 px-3 py-1.5 text-xs hover:bg-stone-800">
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
