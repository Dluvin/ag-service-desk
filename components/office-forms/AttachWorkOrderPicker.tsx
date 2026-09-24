"use client";

import { useMemo, useState } from "react";
import type { OpenWorkOrderOption } from "@/lib/office-forms";
import { useT } from "@/components/I18nProvider";

export function AttachWorkOrderPicker({
  tickets,
  onSelect,
}: {
  tickets: OpenWorkOrderOption[];
  onSelect?: (ticketId: string) => void;
}) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<OpenWorkOrderOption | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? tickets.filter((ticket) =>
          [`#${ticket.number}`, ticket.title, ticket.farmerName, ticket.pivotName, ticket.status]
            .join(" ")
            .toLowerCase()
            .includes(q),
        )
      : tickets;
    return list.slice(0, 40);
  }, [query, tickets]);

  if (tickets.length === 0) {
    return <p className="text-sm text-stone-600">{t("forms.noneOpen")}</p>;
  }

  return (
    <div className="relative min-w-[16rem] flex-1 sm:max-w-md">
      <input type="hidden" name="ticketId" value={selected?.id ?? ""} />
      <label className="block text-sm font-medium">
        {t("forms.chooseWorkOrder")}
        <input
          value={selected && !open ? `#${selected.number} ${selected.title} · ${selected.farmerName}` : query}
          autoComplete="off"
          placeholder={t("forms.findWorkOrder")}
          className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
          onFocus={() => {
            setOpen(true);
            if (selected) setQuery("");
          }}
          onChange={(event) => {
            setSelected(null);
            setQuery(event.target.value);
            setOpen(true);
            onSelect?.("");
          }}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 180);
          }}
        />
      </label>
      {open ? (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-stone-200 bg-white py-1 text-sm shadow-lg">
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-stone-500">{t("forms.noMatch")}</li>
          ) : (
            matches.map((ticket) => (
              <li key={ticket.id}>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left hover:bg-emerald-50"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setSelected(ticket);
                    setQuery("");
                    setOpen(false);
                    onSelect?.(ticket.id);
                  }}
                >
                  <span className="block font-medium">
                    #{ticket.number} {ticket.title}
                  </span>
                  <span className="block text-xs text-stone-500">
                    {ticket.farmerName} · {ticket.pivotName}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
