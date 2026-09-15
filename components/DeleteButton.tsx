"use client";

export function DeleteButton({
  action,
  name,
  value,
  label,
  confirmText,
}: {
  action: (formData: FormData) => Promise<void | { error?: string }>;
  name: string;
  value: string;
  label: string;
  confirmText: string;
}) {
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
      <button type="submit" className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-800 hover:bg-red-50">
        {label}
      </button>
    </form>
  );
}
