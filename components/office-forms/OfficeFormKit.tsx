"use client";

import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { PrintButton } from "@/components/PrintButton";
import { useT } from "@/components/I18nProvider";

const lineClass =
  "w-full border-0 border-b border-stone-400 bg-transparent px-1 py-1 text-sm outline-none print:border-stone-500";

export function FormLine(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${lineClass} ${props.className ?? ""}`} />;
}

export function FormArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${lineClass} min-h-24 resize-y ${props.className ?? ""}`} />;
}

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide text-stone-600">
      {label}
      <div className="mt-0.5 font-normal normal-case tracking-normal text-stone-900">{children}</div>
    </label>
  );
}

export function YesNo({ name, label }: { name: string; label: string }) {
  return (
    <fieldset className="flex flex-wrap items-center gap-3 text-sm">
      <legend className="text-xs font-semibold uppercase tracking-wide text-stone-600">{label}</legend>
      <label className="inline-flex items-center gap-1 font-normal">
        <input type="radio" name={name} value="yes" />
        YES
      </label>
      <label className="inline-flex items-center gap-1 font-normal">
        <input type="radio" name={name} value="no" />
        NO
      </label>
    </fieldset>
  );
}

export function LineTable({
  name,
  columns,
  rows,
}: {
  name: string;
  columns: { key: string; label: string; className?: string }[];
  rows: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="border border-stone-300 bg-stone-50 px-2 py-1 text-left text-xs font-semibold uppercase tracking-wide"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, row) => (
            <tr key={row}>
              {columns.map((column) => (
                <td key={column.key} className={`border border-stone-300 p-0 ${column.className ?? ""}`}>
                  <FormLine name={`${name}.${row}.${column.key}`} className="border-0 px-2 py-1.5" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OfficeFormHeader({
  title,
  orgName,
  logoSrc,
  logoAlt,
}: {
  title: string;
  orgName: string;
  logoSrc: string | null;
  logoAlt: string;
}) {
  return (
    <header className="mb-4 flex flex-wrap items-start justify-between gap-4 border-b border-stone-400 pb-3">
      <div className="flex items-start gap-3">
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoSrc} alt={logoAlt} className="h-14 max-w-44 object-contain" />
        ) : (
          <p className="font-display text-2xl">{orgName}</p>
        )}
        {logoSrc && logoAlt !== orgName ? (
          <p className="pt-1 text-sm text-stone-600">{orgName}</p>
        ) : null}
      </div>
      <h1 className="font-display text-2xl uppercase tracking-wide">{title}</h1>
    </header>
  );
}

export function OfficeFormActions({ fileBase }: { fileBase: string }) {
  const t = useT();

  async function download() {
    const sheet = document.getElementById("office-form-print");
    if (!sheet) return;
    const clone = sheet.cloneNode(true) as HTMLElement;
    for (const img of Array.from(clone.querySelectorAll("img"))) {
      try {
        const source = document.querySelector<HTMLImageElement>(`#office-form-print img[src="${CSS.escape(img.getAttribute("src") ?? "")}"]`);
        const drawn = source && source.naturalWidth ? source : img;
        const canvas = document.createElement("canvas");
        canvas.width = drawn.naturalWidth || 240;
        canvas.height = drawn.naturalHeight || 80;
        const ctx = canvas.getContext("2d");
        if (ctx && drawn.naturalWidth) {
          ctx.drawImage(drawn, 0, 0);
          img.setAttribute("src", canvas.toDataURL("image/png"));
        }
      } catch {
        // keep original src
      }
    }
    clone.querySelectorAll("input, textarea").forEach((node) => {
      const el = node as HTMLInputElement | HTMLTextAreaElement;
      if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
        const mark = document.createElement("span");
        mark.textContent = el.checked ? (el.value === "on" ? "✓" : el.value.toUpperCase()) : "";
        if (el.checked) mark.className = "font-semibold";
        el.replaceWith(mark);
        return;
      }
      const span = document.createElement("span");
      span.textContent = el.value;
      span.style.display = "inline-block";
      span.style.minWidth = "3rem";
      span.style.borderBottom = "1px solid #a8a29e";
      el.replaceWith(span);
    });
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${fileBase}</title>
<style>
  body{font-family:ui-sans-serif,system-ui,sans-serif;color:#1c1917;padding:24px;max-width:960px;margin:0 auto}
  table{width:100%;border-collapse:collapse} th,td{border:1px solid #d6d3d1;padding:4px;font-size:12px;vertical-align:top}
  img{max-height:56px;object-fit:contain}
  @media print { body{padding:0} }
</style></head><body>${clone.innerHTML}</body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileBase}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="no-print mb-4 flex flex-wrap items-center gap-2">
      <PrintButton />
      <button
        type="button"
        onClick={() => void download()}
        className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold"
      >
        {t("forms.download")}
      </button>
    </div>
  );
}
