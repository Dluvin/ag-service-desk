import { STATUS_LABELS, type TicketStatus } from "@/lib/roles";

const TONES: Record<TicketStatus, string> = {
  OPEN: "bg-sky-100 text-sky-900",
  ASSIGNED: "bg-indigo-100 text-indigo-900",
  IN_PROGRESS: "bg-amber-100 text-amber-950",
  WAITING_PARTS: "bg-orange-100 text-orange-950",
  COMPLETED: "bg-emerald-100 text-emerald-900",
  CANCELLED: "bg-stone-200 text-stone-700",
};

export function StatusBadge({ status }: { status: string }) {
  const key = status as TicketStatus;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[key] ?? "bg-stone-100 text-stone-700"}`}
    >
      {STATUS_LABELS[key] ?? status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const tone =
    priority === "URGENT"
      ? "text-red-800"
      : priority === "HIGH"
        ? "text-orange-800"
        : "text-stone-600";
  return <span className={`text-xs font-semibold uppercase tracking-wide ${tone}`}>{priority}</span>;
}
