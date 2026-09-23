import Link from "next/link";
import { requestPasswordResetAction } from "@/lib/actions";
import { getSession } from "@/lib/auth";
import { AuthBrandProvider, AuthEmailInput, AuthScreenLogos } from "@/components/AuthBrand";
import { ActionForm } from "@/components/ActionForm";
import { resolveKnownLoginBrand } from "@/lib/org-brand";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;
  const session = await getSession();
  const dealer = await resolveKnownLoginBrand(session?.organizationId);

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <AuthBrandProvider initial={dealer}>
          <div>
            <AuthScreenLogos />
            <h1 className="font-display text-3xl">Reset password</h1>
            {sent ? (
              <p className="mt-3 text-sm text-stone-600">
                If that email has a dashboard login, we sent a reset link. It expires in 24 hours. Check
                spam if you do not see it.
              </p>
            ) : (
              <>
                <p className="mt-1 text-sm text-stone-600">
                  Staff and customer logins can request a new password. We will email a link if that
                  address is in the system.
                </p>
                <ActionForm action={requestPasswordResetAction} className="mt-6 space-y-4">
                  <label className="block text-sm font-medium">
                    Email
                    <AuthEmailInput />
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
        </AuthBrandProvider>
      </div>
    </div>
  );
}
