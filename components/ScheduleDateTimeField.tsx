"use client";

import { useEffect, useState } from "react";
import { scheduleInputDefault } from "@/lib/schedule";

export function ScheduleDateTimeField({
  name = "scheduledAt",
  label,
  initialValue,
}: {
  name?: string;
  label: string;
  initialValue?: Date | string | null;
}) {
  const [value, setValue] = useState(() => scheduleInputDefault(initialValue));

  useEffect(() => {
    setValue(scheduleInputDefault(initialValue));
  }, [initialValue]);

  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        name={name}
        type="datetime-local"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        suppressHydrationWarning
      />
      <span className="mt-1 block text-xs font-normal text-stone-500">
        Optional. Defaults to now. Clear to leave this work order unscheduled.
      </span>
    </label>
  );
}
