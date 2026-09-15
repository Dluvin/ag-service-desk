"use client";

import { useActionState } from "react";
import { testRevealConnectionAction } from "@/lib/actions";

export function RevealTestForm() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; ok?: string } | null) => {
      return testRevealConnectionAction();
    },
    null,
  );

  return (
    <form action={formAction} className="mt-3">
      {state?.error ? (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {state.ok}
        </p>
      ) : null}
      <button
        disabled={pending}
        className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
      >
        {pending ? "Testing…" : "Test connection"}
      </button>
    </form>
  );
}
