"use client";

import { useActionState } from "react";

type Action = (formData: FormData) => Promise<{ error?: string } | void>;

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
    async (_prev: { error?: string } | null, formData: FormData) => {
      const result = await action(formData);
      return result ?? null;
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
      {children}
    </form>
  );
}
