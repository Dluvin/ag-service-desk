import { assignTicketAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { TicketTechnicianFields } from "@/components/TicketTechnicianFields";
import { TICKET_STATUSES, canAddTechnicians, isFinishedStatus } from "@/lib/roles";
import { statusLabel, t, type Locale } from "@/lib/i18n";

export function DispatchAssignForm({
  ticketId,
  technicianId,
  helperTechnicianId,
  status,
  canAssign,
  technicians,
  actorRole,
  locale,
}: {
  ticketId: string;
  technicianId: string | null;
  helperTechnicianId: string | null;
  status: string;
  canAssign: boolean;
  technicians: { id: string; name: string }[];
  actorRole: string;
  locale: Locale;
}) {
  return (
    <ActionForm action={assignTicketAction} className="mt-2 space-y-2">
      <input type="hidden" name="ticketId" value={ticketId} />
      <TicketTechnicianFields
        technicians={technicians}
        defaultTechnicianId={technicianId}
        defaultHelperTechnicianId={technicianId ? (helperTechnicianId ?? null) : undefined}
        canAssign={canAssign}
        canAdd={canAddTechnicians(actorRole)}
        compact
        leadLabel={t(locale, "ticket.technician")}
        helperLabel={t(locale, "ticket.helperTech")}
        unassignedLabel={t(locale, "common.unassigned")}
        noneLabel={t(locale, "common.none")}
        addNewLabel={t(locale, "ticket.addHelperTech")}
      />
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
