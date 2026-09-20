import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { PLAN } from "@/lib/plan";

export default function SignupThanksPage() {
  return (
    <div className="flex min-h-full items-center justify-center bg-stone-100 px-4 py-16">
      <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <BrandLogo className="mb-6 block" />
        <h1 className="font-display text-3xl">Request received</h1>
        <p className="mt-3 text-sm text-stone-600">
          We sent your company details to AG Desk Pro. After approval you can sign in, walk through
          a sample farm and ticket, and use a {PLAN.trialDays}-day trial. Then it is $
          {PLAN.monthlyDollars}/month for {PLAN.includedSeats} staff seats.
        </p>
        <p className="mt-3 text-sm text-stone-600">
          Billing is set up in Stripe when the tenant is approved. You will get an email with the
          card form (first charge after the trial).
        </p>
        <p className="mt-6 text-sm">
          <Link href="/login" className="font-semibold text-emerald-800 hover:underline">
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}
