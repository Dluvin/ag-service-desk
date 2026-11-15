"use client";

import { useActionState } from "react";
import { testResendEmailAction } from "@/lib/actions";

export function EmailTestForm({ configured }: { configured: boolean }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; ok?: string } | null, formData: FormData) => {
      return testResendEmailAction(formData);
    },
    null,
  );

  return (
    <form action={formAction} className="mt-6 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-sm font-semibold text-stone-800">Send a test email</p>
      {configured ? null : (
        <p className="text-sm text-stone-600">Save a Resend API key and from address above, then send the test.</p>
      )}
      {state?.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{state.ok}</p>
      ) : null}
      <label className="block text-sm font-medium">
        Email address
        <input name="testEmail" type="email" required placeholder="office@example.com" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
      </label>
      <button disabled={pending} className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Sending…" : "Send test email"}
      </button>
    </form>
  );
}
