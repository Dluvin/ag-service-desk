"use client";

import { useActionState } from "react";

type ActionState = { error?: string; success?: string } | null;
type Action = (formData: FormData) => Promise<ActionState | void>;

function isNextRedirect(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    String((error as { digest: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

export function ActionForm({
  action,
  children,
  className,
  encType,
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
  encType?: string;
}) {
  const [state, formAction] = useActionState(
    async (_prev: ActionState, formData: FormData) => {
      try {
        const result = await action(formData);
        return result ?? null;
      } catch (error) {
        if (isNextRedirect(error)) throw error;
        return { error: error instanceof Error ? error.message : "Something went wrong." };
      }
    },
    null,
  );

  return (
    <form action={formAction} className={className} encType={encType} suppressHydrationWarning>
      {state?.error ? (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {state.success}
        </p>
      ) : null}
      {children}
    </form>
  );
}
