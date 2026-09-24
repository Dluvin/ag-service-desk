import { STATUS_LABELS, type TicketStatus } from "@/lib/roles";

const TONES: Record<TicketStatus, string> = {
  OPEN: "bg-sky-200 text-sky-950 dark:bg-sky-400 dark:text-sky-950",
  ASSIGNED: "bg-indigo-200 text-indigo-950 dark:bg-indigo-400 dark:text-indigo-950",
  IN_PROGRESS: "bg-amber-200 text-amber-950 dark:bg-amber-400 dark:text-amber-950",
  WAITING_PARTS: "bg-orange-200 text-orange-950 dark:bg-orange-400 dark:text-orange-950",
  REPAIR_DONE: "bg-lime-200 text-lime-950 dark:bg-lime-400 dark:text-lime-950",
  COMPLETED: "bg-emerald-200 text-emerald-950 dark:bg-emerald-400 dark:text-emerald-950",
  CANCELLED: "bg-stone-300 text-stone-900 dark:bg-stone-500 dark:text-stone-50",
};

export function StatusBadge({ status }: { status: string }) {
  const key = status as TicketStatus;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[key] ?? "bg-stone-100 text-stone-700 dark:bg-stone-700 dark:text-stone-200"}`}
    >
      {STATUS_LABELS[key] ?? status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const tone =
    priority === "URGENT"
      ? "text-red-800 dark:text-red-300"
      : priority === "HIGH"
        ? "text-orange-800 dark:text-orange-300"
        : "text-stone-600";
  return <span className={`text-xs font-semibold uppercase tracking-wide ${tone}`}>{priority}</span>;
}
