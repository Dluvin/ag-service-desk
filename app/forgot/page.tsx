import Link from "next/link";
import { requestPasswordResetAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { BrandLogo } from "@/components/BrandLogo";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <BrandLogo className="mb-6 block" />
        <h1 className="font-display text-3xl">Reset password</h1>
        {sent ? (
          <p className="mt-3 text-sm text-stone-600">
            If that email has a dashboard login, we sent a reset link. It expires in 24 hours. Check
            spam if you do not see it.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-stone-600">
              Staff and customer logins can request a new password. We will email a link if that address
              is in the system.
            </p>
            <ActionForm action={requestPasswordResetAction} className="mt-6 space-y-4">
              <label className="block text-sm font-medium">
                Email
                <input
                  name="email"
                  type="email"
                  required
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </label>
              <button className="w-full rounded-lg bg-emerald-800 px-4 py-2.5 font-semibold text-white hover:bg-emerald-700">
                Send reset link
              </button>
            </ActionForm>
          </>
        )}
        <p className="mt-4 text-sm text-stone-600">
          <Link href="/login" className="font-medium text-emerald-800 hover:underline">
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}
