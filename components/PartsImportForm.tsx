"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { importCatalogPartsBatchAction } from "@/lib/actions";
import { decodeImportBytes, parseQuickbooksExport, uniqueImportedParts } from "@/lib/quickbooks";

const BATCH_SIZE = 250;

export function PartsImportForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem("file");
    const file = input instanceof HTMLInputElement ? input.files?.[0] : null;
    if (!file) {
      setError("Choose a QuickBooks CSV or IIF file to import.");
      return;
    }

    const name = file.name.toLowerCase();
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      setError("Save the Excel export as CSV first, then import that CSV.");
      return;
    }
    if (file.size > 20_000_000) {
      setError("File is too large. Keep the export under 20 MB and save Excel as CSV.");
      return;
    }

    setBusy(true);
    setError(null);
    setStatus("Reading file…");

    try {
      const text = decodeImportBytes(new Uint8Array(await file.arrayBuffer()));
      const parts = uniqueImportedParts(parseQuickbooksExport(text));
      if (parts.length === 0) {
        const preview = text.split(/\r?\n/).slice(0, 3).join(" | ").slice(0, 180);
        setError(
          `No parts found. Use a CSV or IIF with a Name or Product/Service column. First rows: ${preview || "(empty)"}`,
        );
        return;
      }

      let created = 0;
      let updated = 0;
      for (let i = 0; i < parts.length; i += BATCH_SIZE) {
        const batch = parts.slice(i, i + BATCH_SIZE);
        setStatus(`Saving ${Math.min(i + BATCH_SIZE, parts.length).toLocaleString()} of ${parts.length.toLocaleString()} parts…`);
        const result = await importCatalogPartsBatchAction(batch);
        if ("error" in result) {
          setError(
            `${result.error} Saved ${created.toLocaleString()} new and ${updated.toLocaleString()} updated before this stopped. Run the import again to finish.`,
          );
          return;
        }
        created += result.created;
        updated += result.updated;
      }

      router.push(`/parts?imported=${created}&updated=${updated}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("The file could not be imported. Save it as CSV (comma separated) from Excel and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}
      {status && busy ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">{status}</p>
      ) : null}
      <label className="block text-sm font-medium">
        QuickBooks file
        <input name="file" type="file" accept=".csv,.txt,.iif,.tsv" required disabled={busy} className="mt-1 w-full text-sm" />
      </label>
      <button
        disabled={busy}
        className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Importing…" : "Import parts"}
      </button>
    </form>
  );
}
