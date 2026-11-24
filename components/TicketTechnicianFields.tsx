"use client";

import { useMemo, useState } from "react";
import { HELPER_NEW, HELPER_NONE } from "@/lib/ticket-helper";

type Tech = { id: string; name: string };

export function TicketTechnicianFields({
  technicians,
  defaultTechnicianId = "",
  defaultHelperTechnicianId,
  canAssign,
  canAdd,
  compact = false,
  leadLabel = "Assign technician",
  helperLabel = "Technician helper",
  unassignedLabel = "Unassigned",
  noneLabel = "None",
  addNewLabel = "Add new technician…",
}: {
  technicians: Tech[];
  defaultTechnicianId?: string | null;
  /** Undefined = no choice yet (forces pick when lead is set). Null = explicitly None. */
  defaultHelperTechnicianId?: string | null;
  canAssign: boolean;
  canAdd: boolean;
  compact?: boolean;
  leadLabel?: string;
  helperLabel?: string;
  unassignedLabel?: string;
  noneLabel?: string;
  addNewLabel?: string;
}) {
  const [leadId, setLeadId] = useState(defaultTechnicianId ?? "");
  const initialHelper =
    defaultHelperTechnicianId === undefined
      ? ""
      : defaultHelperTechnicianId === null
        ? HELPER_NONE
        : defaultHelperTechnicianId;
  const [helperId, setHelperId] = useState(initialHelper);

  const helperOptions = useMemo(
    () => technicians.filter((tech) => tech.id !== leadId),
    [technicians, leadId],
  );

  const selectClass = compact
    ? "w-full rounded-md border border-stone-300 px-2 py-1 text-xs"
    : "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2";
  const labelClass = compact ? "block text-xs font-medium text-stone-700" : "block text-sm font-medium";

  if (!canAssign) {
    return (
      <>
        <input type="hidden" name="technicianId" value={defaultTechnicianId ?? ""} />
        <input
          type="hidden"
          name="helperTechnicianId"
          value={
            defaultHelperTechnicianId
              ? defaultHelperTechnicianId
              : defaultTechnicianId
                ? HELPER_NONE
                : ""
          }
        />
      </>
    );
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-4"}>
      <label className={labelClass}>
        {leadLabel}
        <select
          name="technicianId"
          value={leadId}
          onChange={(event) => {
            const next = event.target.value;
            setLeadId(next);
            if (!next) setHelperId("");
            else if (helperId === next) setHelperId("");
          }}
          className={selectClass}
        >
          <option value="">{unassignedLabel}</option>
          {technicians.map((tech) => (
            <option key={tech.id} value={tech.id}>
              {tech.name}
            </option>
          ))}
        </select>
      </label>

      {leadId ? (
        <div className={compact ? "space-y-2" : "space-y-3"}>
          <label className={labelClass}>
            {helperLabel}
            <select
              name="helperTechnicianId"
              value={helperId}
              required
              onChange={(event) => setHelperId(event.target.value)}
              className={selectClass}
            >
              <option value="" disabled>
                Select helper…
              </option>
              <option value={HELPER_NONE}>{noneLabel}</option>
              {helperOptions.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.name}
                </option>
              ))}
              {canAdd ? <option value={HELPER_NEW}>{addNewLabel}</option> : null}
            </select>
          </label>
          {helperId === HELPER_NEW ? (
            <div className={compact ? "grid gap-2" : "grid gap-3 sm:grid-cols-2"}>
              <label className={labelClass}>
                Helper name
                <input name="helperName" required className={selectClass} />
              </label>
              <label className={labelClass}>
                Helper email
                <input name="helperEmail" type="email" required className={selectClass} />
              </label>
              <label className={labelClass}>
                Helper phone
                <input name="helperPhone" className={selectClass} />
              </label>
              <label className={labelClass}>
                Temp password (optional)
                <input name="helperPassword" type="password" autoComplete="new-password" className={selectClass} />
              </label>
            </div>
          ) : null}
        </div>
      ) : (
        <input type="hidden" name="helperTechnicianId" value="" />
      )}
    </div>
  );
}
