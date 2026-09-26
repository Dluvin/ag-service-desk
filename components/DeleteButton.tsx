"use client";

import { useEffect, useId, useState } from "react";
import { useT } from "@/components/I18nProvider";

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/^#/, "");
}

function isNextRedirect(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    String((error as { digest: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

export function DeleteButton({
  action,
  name,
  value,
  label,
  confirmText,
  typedMatch,
}: {
  action: (formData: FormData) => Promise<void | { error?: string }>;
  name: string;
  value: string;
  label: string;
  confirmText: string;
  typedMatch?: string | string[];
}) {
  const t = useT();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const matches = (Array.isArray(typedMatch) ? typedMatch : typedMatch ? [typedMatch] : []).filter(Boolean);
  const phrase = t("delete.phrase");
  const primaryMatch = matches[0] ?? "";
  const typedOk =
    matches.length > 0 &&
    (() => {
      const input = normalize(typed);
      if (!input) return false;
      if (input === normalize(phrase) || input === "delete me" || input === "borrar") return true;
      return matches.some((match) => input === normalize(match));
    })();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function runDelete() {
    const formData = new FormData();
    formData.set(name, value);
    setPending(true);
    try {
      await action(formData);
      setOpen(false);
    } catch (error) {
      if (isNextRedirect(error)) throw error;
      throw error;
    } finally {
      setPending(false);
    }
  }

  if (matches.length === 0) {
    return (
      <form
        action={async (formData) => {
          await action(formData);
        }}
        onSubmit={(event) => {
          if (!window.confirm(confirmText)) event.preventDefault();
        }}
      >
        <input type="hidden" name={name} value={value} />
        <button
          type="submit"
          className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-800 hover:bg-red-50"
        >
          {label}
        </button>
      </form>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setTyped("");
          setOpen(true);
        }}
        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-800 hover:bg-red-50"
      >
        {label}
      </button>
      {open ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-4 shadow-lg"
          >
            <h3 id={titleId} className="font-display text-xl">
              {label}
            </h3>
            <p className="mt-2 text-sm text-stone-700">{confirmText}</p>
            <p className="mt-2 text-sm text-stone-600">
              {t("delete.hint", { match: primaryMatch, phrase })}
            </p>
            <input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoFocus
              className="mt-3 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              onKeyDown={(event) => {
                if (event.key === "Enter" && typedOk && !pending) {
                  event.preventDefault();
                  void runDelete();
                }
              }}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!typedOk || pending}
                onClick={() => void runDelete()}
                className="rounded-lg bg-red-800 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("delete.confirm")}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-100"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
