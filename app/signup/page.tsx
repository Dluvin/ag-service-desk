import { PLAN } from "@/lib/plan";
import { signupAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { BrandLogo } from "@/components/BrandLogo";
import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="flex min-h-full items-center justify-center bg-stone-100 px-4 py-16">
      <div className="w-full max-w-xl rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <BrandLogo className="mb-6 block" />
        <h1 className="font-display text-3xl">Start a company</h1>
        <p className="mt-2 text-sm text-stone-600">
          Request an AG Desk Pro tenant. We review each signup, then you get a live company with a
          sample farm and ticket for a <span className="font-semibold">{PLAN.trialDays}-day trial</span>.
          After that it is <span className="font-semibold">${PLAN.monthlyDollars}/month</span> for{" "}
          {PLAN.includedSeats} staff seats. Extra seats are ${PLAN.extraSeatDollars}/month. Farm logins
          are not counted as staff seats.
        </p>
        <ActionForm action={signupAction} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium sm:col-span-2">
            Company name
            <input name="company" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            Your name
            <input name="name" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            Title
            <input name="title" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" placeholder="Owner, service manager…" />
          </label>
          <label className="block text-sm font-medium">
            Work email
            <input name="email" type="email" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            Phone
            <input name="phone" type="tel" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium sm:col-span-2">
            Street address
            <input name="address" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            City
            <input name="city" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            State
            <input name="region" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            ZIP
            <input name="postalCode" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            Staff who will log in
            <input name="staffCount" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" placeholder="Admins, managers, techs" />
          </label>
          <label className="block text-sm font-medium sm:col-span-2">
            Password for your admin login
            <input name="password" type="password" minLength={8} required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
            <span className="mt-1 block text-xs font-normal text-stone-500">
              Used after we approve the company. At least 8 characters.
            </span>
          </label>
          <label className="block text-sm font-medium sm:col-span-2">
            Anything we should know
            <textarea name="notes" rows={3} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <button className="sm:col-span-2 w-full rounded-lg bg-emerald-800 px-4 py-2.5 font-semibold text-white hover:bg-emerald-700">
            Request company
          </button>
        </ActionForm>
        <p className="mt-4 text-sm text-stone-600">
          Already approved?{" "}
          <Link href="/login" className="font-semibold text-emerald-800 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
