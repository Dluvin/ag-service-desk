"use client";

export function ListSearch({
  value,
  onChange,
  placeholder,
  label,
  className = "mt-4 block text-sm font-medium",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  className?: string;
}) {
  return (
    <label className={className}>
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
      />
    </label>
  );
}
