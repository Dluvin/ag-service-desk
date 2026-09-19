import Link from "next/link";
import { setPasswordFromWelcomeAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { userFromPasswordToken } from "@/lib/welcome-mail";

export const dynamic = "force-dynamic";

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const row = token ? await userFromPasswordToken(token) : null;

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="font-display text-3xl">Set your password</h1>
        {!row ? (
          <>
            <p className="mt-3 text-sm text-stone-600">
              This link is invalid or has expired.{" "}
              <Link href="/forgot" className="font-medium text-emerald-800 hover:underline">
                Request a new reset link
              </Link>{" "}
              or{" "}
              <Link href="/login" className="font-medium text-emerald-800 hover:underline">
                sign in
              </Link>{" "}
              if you already have a password.
            </p>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-stone-600">
              Welcome to {row.user.organization.name}. Choose a password for {row.user.email}, then you
              will land on the dashboard.
            </p>
            <ActionForm action={setPasswordFromWelcomeAction} className="mt-6 space-y-4">
              <input type="hidden" name="token" value={token} />
              <label className="block text-sm font-medium">
                New password
                <input
                  name="password"
                  type="password"
                  minLength={8}
                  required
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm font-medium">
                Confirm password
                <input
                  name="confirmPassword"
                  type="password"
                  minLength={8}
                  required
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </label>
              <button className="w-full rounded-lg bg-emerald-800 px-4 py-2.5 font-semibold text-white hover:bg-emerald-700">
                Save password and continue
              </button>
            </ActionForm>
          </>
        )}
      </div>
    </div>
  );
}
