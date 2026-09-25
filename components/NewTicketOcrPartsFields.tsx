"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/I18nProvider";
import { OCR_FILL_NEW_SITE_EVENT, type OcrFillLine, type OcrFillNewSiteDetail } from "@/lib/ocr-site-match";

export function NewTicketOcrPartsFields() {
  const t = useT();
  const [rows, setRows] = useState<OcrFillLine[]>([]);

  useEffect(() => {
    function onFill(event: Event) {
      const detail = (event as CustomEvent<OcrFillNewSiteDetail>).detail;
      const parts = (detail?.parts ?? [])
        .map((row) => ({
          quantity: Number.isFinite(row.quantity) && row.quantity > 0 ? row.quantity : 1,
          name: (row.name ?? "").trim(),
          sku: (row.sku ?? "").trim(),
        }))
        .filter((row) => row.name);
      setRows(parts);
    }

    window.addEventListener(OCR_FILL_NEW_SITE_EVENT, onFill);
    return () => window.removeEventListener(OCR_FILL_NEW_SITE_EVENT, onFill);
  }, []);

  if (rows.length === 0) return null;

  return (
    <fieldset className="space-y-2 rounded-lg border border-stone-200 bg-stone-50 p-4">
      <legend className="px-1 text-sm font-medium">{t("ticket.parts")}</legend>
      <input type="hidden" name="partsCount" value={rows.length} />
      {rows.map((row, index) => (
        <div key={`${row.name}-${index}`} className="grid gap-2 sm:grid-cols-12">
          <input
            name={`parts.${index}.quantity`}
            type="number"
            step="0.01"
            min="0"
            value={row.quantity}
            onChange={(event) => {
              const next = [...rows];
              next[index] = { ...row, quantity: Number(event.target.value) || 0 };
              setRows(next);
            }}
            className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm sm:col-span-2"
            aria-label={t("ticket.quantity")}
          />
          <input
            name={`parts.${index}.sku`}
            value={row.sku}
            placeholder={t("ocr.sku")}
            onChange={(event) => {
              const next = [...rows];
              next[index] = { ...row, sku: event.target.value };
              setRows(next);
            }}
            className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm sm:col-span-3"
          />
          <input
            name={`parts.${index}.name`}
            value={row.name}
            placeholder={t("ocr.itemName")}
            onChange={(event) => {
              const next = [...rows];
              next[index] = { ...row, name: event.target.value };
              setRows(next);
            }}
            className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm sm:col-span-7"
          />
        </div>
      ))}
    </fieldset>
  );
}
