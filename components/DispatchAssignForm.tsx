import { assignTicketAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { TICKET_STATUSES, isFinishedStatus } from "@/lib/roles";
import { statusLabel, t, type Locale } from "@/lib/i18n";

export function DispatchAssignForm({
  ticketId,
  technicianId,
  status,
  canAssign,
  technicians,
  locale,
}: {
  ticketId: string;
  technicianId: string | null;
  status: string;
  canAssign: boolean;
  technicians: { id: string; name: string }[];
  locale: Locale;
}) {
  return (
    <ActionForm action={assignTicketAction} className="mt-2 space-y-2">
      <input type="hidden" name="ticketId" value={ticketId} />
      {canAssign ? (
        <select
          name="technicianId"
          defaultValue={technicianId ?? ""}
          className="w-full rounded-md border border-stone-300 px-2 py-1 text-xs"
        >
          <option value="">{t(locale, "common.unassigned")}</option>
          {technicians.map((tech) => (
            <option key={tech.id} value={tech.id}>
              {tech.name}
            </option>
          ))}
        </select>
      ) : (
        <input type="hidden" name="technicianId" value={technicianId ?? ""} />
      )}
      <select name="status" defaultValue={status} className="w-full rounded-md border border-stone-300 px-2 py-1 text-xs">
        {TICKET_STATUSES.filter((value) => !isFinishedStatus(value) || status === value).map((value) => (
          <option key={value} value={value}>
            {statusLabel(locale, value)}
          </option>
        ))}
      </select>
      <button className="w-full rounded-md bg-emerald-800 px-2 py-1 text-xs font-semibold text-white">{t(locale, "common.update")}</button>
    </ActionForm>
  );
}
