import Link from "next/link";
import { signupAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";

export default function SignupPage() {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="font-display text-3xl">Start a company</h1>
        <p className="mt-1 text-sm text-stone-600">Creates a new tenant. Your farmers and technicians stay isolated from other companies.</p>
        <ActionForm action={signupAction} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            Company name
            <input name="company" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            Your name
            <input name="name" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            Email
            <input name="email" type="email" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input name="password" type="password" minLength={8} required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <button className="w-full rounded-lg bg-emerald-800 px-4 py-2.5 font-semibold text-white hover:bg-emerald-700">
            Create company
          </button>
        </ActionForm>
        <p className="mt-4 text-sm text-stone-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-emerald-800 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
