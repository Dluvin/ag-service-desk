"use client";

import { useState } from "react";
import type { LockedPlanNote } from "@/lib/plans";

export function PlanLockedMenu({ planLabel, notes }: { planLabel: string; notes: LockedPlanNote[] }) {
  const [open, setOpen] = useState(false);
  if (!notes.length) return null;

  return (
    <div className="relative" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="text-emerald-200/80 hover:text-white"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        Not on {planLabel}
      </button>
      {open ? (
        <div className="absolute left-0 z-50 mt-2 w-80 rounded-lg border border-emerald-800 bg-emerald-950 p-3 text-xs leading-5 text-emerald-100 shadow-lg">
          {notes.map((note) => (
            <p key={note.id} className="mt-2 first:mt-0">
              <span className="font-semibold text-white">{note.title}.</span> {note.why}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
