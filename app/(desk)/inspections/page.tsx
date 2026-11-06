import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  formatInspectionDate,
  inspectionSubtitle,
  inspectionTitle,
  isInspectionKind,
  readVisit,
  visitAttention,
} from "@/lib/inspection-form";
import { listInspections } from "@/lib/inspections";
import { ROLES } from "@/lib/roles";

export default async function InspectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === ROLES.FARMER) redirect("/dashboard");
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const rows = await listInspections(session, q);
  const printHref = q ? `/inspections/print?q=${encodeURIComponent(q)}` : "/inspections/print";

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-5">
      <div>
        <h1 className="font-display text-3xl">Pivot inspections</h1>
        <p className="mt-1 text-stone-600">
          Same visit wizard as the field inspection form: pivot point, then each tower. The first save opens a
          scheduled work order tied to the customer and pivot.
        </p>
      </div>
      {params.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{params.error}</p>
      ) : null}
      <Link
        href="/inspections/new"
        className="rounded-xl bg-emerald-800 px-4 py-4 text-center text-base font-medium text-white hover:bg-emerald-700"
      >
        New inspection
      </Link>
      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Customer, pivot, or inspector"
          className="h-12 min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 text-base"
        />
        <button className="h-12 rounded-xl border border-stone-300 bg-white px-4 text-sm">Search</button>
      </form>
      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="text-stone-600">
          {rows.length ? `${rows.length.toLocaleString("en-US")} saved` : "None saved yet"}
          {rows.length === 200 ? ", most recent" : ""}
          {q ? ` for “${q}”` : ""}
        </p>
        <Link href={printHref} className="font-medium text-emerald-800">
          Print / PDF
        </Link>
      </div>
      <div className="grid gap-3">
        {rows.map((row) => {
          if (!isInspectionKind(row.kind)) return null;
          const visit = readVisit(row.headerJson, row.checksJson);
          const problems = visitAttention(visit);
          return (
            <Link
              key={row.id}
              href={`/inspections/${row.id}`}
              className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
            >
              <p className="text-sm font-medium text-emerald-800">{inspectionTitle(row.kind)}</p>
              <p className="text-lg leading-snug text-stone-950">{row.customerName}</p>
              <p className="mt-1 text-sm text-stone-600">
                {formatInspectionDate(row.inspectedOn)} · {inspectionSubtitle(row.kind, {
                  brand: visit.brand,
                  serialNumber: visit.serialNumber,
                  towerCount: String(visit.towerCount),
                  pivotId: visit.pivotId,
                })}
              </p>
              <p className="mt-1 text-sm text-stone-600">
                {row.inspectedBy}
                {problems ? ` · ${problems} to follow up` : ""}
                {row.ticket ? ` · WO #${row.ticket.number}` : ""}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
