import { platformLoginAction } from "@/lib/platform-actions";
import { ActionForm } from "@/components/ActionForm";

export const dynamic = "force-dynamic";

export default function PlatformLoginPage() {
  const configured = Boolean(process.env.PLATFORM_ADMIN_EMAIL && process.env.PLATFORM_ADMIN_PASSWORD);

  return (
    <div className="flex min-h-full items-center justify-center bg-stone-100 px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-wider text-stone-500">AG Service Desk</p>
        <h1 className="font-display mt-1 text-3xl">Platform admin</h1>
        <p className="mt-2 text-sm text-stone-600">
          Sign in to manage every company on this app. This is not a tenant login.
        </p>
        {!configured ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            Set PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD on the server, then sign in with those
            values once to create the first super admin.
          </p>
        ) : null}
        <ActionForm action={platformLoginAction} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            Email
            <input name="email" type="email" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input name="password" type="password" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <button className="w-full rounded-lg bg-stone-900 px-4 py-2.5 font-semibold text-white hover:bg-stone-800">
            Sign in
          </button>
        </ActionForm>
      </div>
    </div>
  );
}
