"use client";

import { useMemo, useState } from "react";
import { HELPER_NEW, HELPER_NONE } from "@/lib/ticket-helper-constants";

type Tech = { id: string; name: string };

export function TicketTechnicianFields({
  technicians,
  defaultTechnicianId = "",
  defaultHelperTechnicianIds,
  canAssign,
  canAdd,
  compact = false,
  leadLabel = "Assign Lead Technician",
  helperLabel = "Technician helpers",
  helperHelp,
  unassignedLabel = "Unassigned",
  noneLabel = "None",
  addNewLabel = "Add new technician…",
}: {
  technicians: Tech[];
  defaultTechnicianId?: string | null;
  /**
   * Undefined = no choice yet (forces pick when lead is set).
   * Empty array = explicitly None.
   * Non-empty = selected helper ids.
   */
  defaultHelperTechnicianIds?: string[] | null;
  canAssign: boolean;
  canAdd: boolean;
  compact?: boolean;
  leadLabel?: string;
  helperLabel?: string;
  helperHelp?: string;
  unassignedLabel?: string;
  noneLabel?: string;
  addNewLabel?: string;
}) {
  const [leadId, setLeadId] = useState(defaultTechnicianId ?? "");
  const initialHelpers =
    defaultHelperTechnicianIds === undefined
      ? null
      : [...new Set((defaultHelperTechnicianIds ?? []).filter(Boolean))];
  const [helperIds, setHelperIds] = useState<string[] | null>(initialHelpers);
  const [addingNew, setAddingNew] = useState(false);

  const helperOptions = useMemo(
    () => technicians.filter((tech) => tech.id !== leadId),
    [technicians, leadId],
  );

  const selectClass = compact
    ? "w-full rounded-md border border-stone-300 px-2 py-1 text-xs"
    : "mt-1 w-full rounded-lg border border-stone-300 px-3 py-2";
  const labelClass = compact ? "block text-xs font-medium text-stone-700" : "block text-sm font-medium";
  const helpClass = compact ? "mt-1 text-[11px] leading-snug text-stone-500" : "mt-1 text-xs text-stone-500";
  const boxClass = compact
    ? "max-h-36 space-y-1 overflow-y-auto rounded-md border border-stone-300 bg-white p-2"
    : "mt-1 max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-stone-300 bg-white p-3";

  const noneSelected = helperIds !== null && helperIds.length === 0 && !addingNew;
  const submittedValues =
    helperIds === null
      ? []
      : noneSelected
        ? [HELPER_NONE]
        : addingNew
          ? [...helperIds, HELPER_NEW]
          : helperIds;

  function setNone() {
    setHelperIds([]);
    setAddingNew(false);
  }

  function toggleHelper(id: string) {
    setHelperIds((current) => {
      const base = current ?? [];
      if (base.includes(id)) return base.filter((value) => value !== id);
      return [...base, id];
    });
  }

  if (!canAssign) {
    const locked = defaultHelperTechnicianIds?.length
      ? defaultHelperTechnicianIds
      : defaultTechnicianId
        ? [HELPER_NONE]
        : [];
    return (
      <>
        <input type="hidden" name="technicianId" value={defaultTechnicianId ?? ""} />
        {locked.map((id) => (
          <input key={id} type="hidden" name="helperTechnicianIds" value={id} />
        ))}
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
            if (!next) {
              setHelperIds(null);
              setAddingNew(false);
              return;
            }
            setHelperIds((current) => {
              if (current === null) return null;
              return current.filter((id) => id !== next);
            });
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
        <fieldset className={compact ? "space-y-1" : "space-y-2"}>
          <legend className={labelClass}>{helperLabel}</legend>
          {helperHelp ? <p className={helpClass}>{helperHelp}</p> : null}
          <div className={boxClass}>
            <label className="flex items-start gap-2 text-sm text-stone-800">
              <input
                type="checkbox"
                checked={noneSelected}
                onChange={(event) => {
                  if (event.target.checked) setNone();
                  else setHelperIds(null);
                }}
                className="mt-0.5"
              />
              <span>{noneLabel}</span>
            </label>
            {helperOptions.map((tech) => {
              const checked = (helperIds ?? []).includes(tech.id);
              return (
                <label key={tech.id} className="flex items-start gap-2 text-sm text-stone-800">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setAddingNew(false);
                      toggleHelper(tech.id);
                    }}
                    className="mt-0.5"
                  />
                  <span>{tech.name}</span>
                </label>
              );
            })}
            {canAdd ? (
              <label className="flex items-start gap-2 text-sm text-stone-800">
                <input
                  type="checkbox"
                  checked={addingNew}
                  onChange={(event) => {
                    const on = event.target.checked;
                    setAddingNew(on);
                    if (on) {
                      setHelperIds((current) => current ?? []);
                    }
                  }}
                  className="mt-0.5"
                />
                <span>{addNewLabel}</span>
              </label>
            ) : null}
          </div>
          {/* Required native check: at least one submitted helper value when lead is set */}
          <select
            className="sr-only"
            aria-hidden
            tabIndex={-1}
            required
            value={submittedValues[0] ?? ""}
            onChange={() => {}}
          >
            <option value="" disabled>
              Select helpers…
            </option>
            {submittedValues.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          {submittedValues.map((value) => (
            <input key={value} type="hidden" name="helperTechnicianIds" value={value} />
          ))}
          {addingNew ? (
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
        </fieldset>
      ) : null}
    </div>
  );
}
