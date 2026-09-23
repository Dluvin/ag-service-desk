import Link from "next/link";
import { loginAction } from "@/lib/actions";
import { getSession } from "@/lib/auth";
import { AuthBrandProvider, AuthEmailInput, AuthScreenLogos } from "@/components/AuthBrand";
import { ActionForm } from "@/components/ActionForm";
import { resolveKnownLoginBrand } from "@/lib/org-brand";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ paused?: string; billing?: string }>;
}) {
  let userCount = 0;
  try {
    userCount = await prisma.user.count();
  } catch {
    userCount = 0;
  }
  const showDemo = process.env.NODE_ENV !== "production";
  const query = await searchParams;
  const session = await getSession();
  const dealer = await resolveKnownLoginBrand(session?.organizationId);

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <AuthBrandProvider initial={dealer}>
          <div>
            <AuthScreenLogos />
            <h1 className="font-display text-3xl">Log in</h1>
            <p className="mt-1 text-sm text-stone-600">
              Customers, technicians, managers, and company admins use the same door.
            </p>
            {query.billing === "ok" ? (
              <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
                Billing is set. Sign in to your company. The 15-day trial is on the Stripe subscription.
              </p>
            ) : null}
            {query.billing === "pending" ? (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                Card setup was canceled. You can still sign in during the trial. Open the billing email
                again when you are ready.
              </p>
            ) : null}
            {query.paused ? (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                This company is paused. Contact AG Service Desk if you need access restored.
              </p>
            ) : null}
            {userCount === 0 ? (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                This host has no users yet. Demo emails from your PC will not work here.{" "}
                <Link href="/signup" className="font-semibold underline">
                  Create a company account
                </Link>{" "}
                first, then sign in with that email and password.
              </p>
            ) : null}
            <ActionForm action={loginAction} className="mt-6 space-y-4">
              <label className="block text-sm font-medium">
                Email
                <AuthEmailInput />
              </label>
              <label className="block text-sm font-medium">
                Password
                <input
                  name="password"
                  type="password"
                  required
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              </label>
              <button className="w-full rounded-lg bg-emerald-800 px-4 py-2.5 font-semibold text-white hover:bg-emerald-700">
                Sign in
              </button>
            </ActionForm>
            <p className="mt-3 text-sm">
              <Link href="/forgot" className="font-medium text-emerald-800 hover:underline">
                Forgot password?
              </Link>
            </p>
            <p className="mt-4 text-sm text-stone-600">
              New company?{" "}
              <Link href="/signup" className="font-medium text-emerald-800 hover:underline">
                Create an account
              </Link>
            </p>
            <p className="mt-2 text-sm text-stone-600">
              Invited and need a password? Use the link in your welcome email, or reset from this screen.
            </p>
            {showDemo ? (
              <div className="mt-6 rounded-lg bg-stone-50 p-3 text-xs text-stone-600">
                <p className="font-semibold text-stone-800">Demo (password: demo1234)</p>
                <p>Admin: admin@heartland.ag</p>
                <p>Manager: manager@heartland.ag</p>
                <p>Technician: mike@heartland.ag</p>
                <p>Customer: tom@greenacres.farm</p>
                <p>Second tenant admin: admin@prairie.ag</p>
              </div>
            ) : null}
          </div>
        </AuthBrandProvider>
      </div>
    </div>
  );
}
