import {
  formatInspectionDate,
  inspectionDiagram,
  inspectionDiagramAlt,
  inspectionFields,
  inspectionItems,
  inspectionSections,
  inspectionTitle,
  statusLabel,
  statusNeedsAttention,
  type CheckMap,
  type InspectionKind,
} from "@/lib/inspection-form";

export function InspectionSheet({
  companyName,
  kind,
  customerName,
  inspectedOn,
  inspectedBy,
  header,
  checks,
  kicker = "",
  extra = [],
}: {
  companyName: string;
  kind: InspectionKind;
  customerName: string;
  inspectedOn: string;
  inspectedBy: string;
  header: Record<string, string>;
  checks: CheckMap;
  kicker?: string;
  extra?: { label: string; value: string }[];
}) {
  const items = inspectionItems(kind);
  return (
    <article className="inspection-sheet rounded-xl border border-stone-200 bg-white p-4 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <header className="text-center">
        <p className="text-base font-semibold text-stone-900">{companyName}</p>
        <h2 className="text-2xl">{inspectionTitle(kind)}</h2>
        {kicker ? <p className="mt-1 text-lg font-medium text-emerald-900">{kicker}</p> : null}
      </header>
      <dl className="mt-4 grid gap-2 text-base sm:grid-cols-2">
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">Pivot owner</dt>
          <dd className="text-stone-900">{customerName || "—"}</dd>
        </div>
        {extra.map((field) => (
          <div key={field.label}>
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">{field.label}</dt>
            <dd className="text-stone-900">{field.value || "—"}</dd>
          </div>
        ))}
        {inspectionFields(kind).map((field) => (
          <div key={field.name}>
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">{field.label}</dt>
            <dd className="text-stone-900">{header[field.name]?.trim() || "—"}</dd>
          </div>
        ))}
      </dl>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={inspectionDiagram(kind)} alt={inspectionDiagramAlt(kind)} className="inspection-diagram mx-auto mt-4 w-full max-w-md" />
      {inspectionSections(kind).map((section) => (
        <section key={section.id} className="mt-4">
          <h3 className="text-lg">{section.title}</h3>
          {section.id === "drive" ? <p className="text-sm text-stone-600">Code: R = replace, LK = leaks, LO = loose</p> : null}
          <ul className="mt-2 divide-y divide-stone-200 border-y border-stone-200">
            {items
              .filter((item) => item.section === section.id)
              .map((item) => {
                const check = checks[item.id];
                const status = check?.status ?? "";
                const attention = statusNeedsAttention(status);
                return (
                  <li key={item.id} className="inspection-check grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 py-2">
                    <span className={`text-sm font-semibold ${attention ? "text-amber-800" : status === "ok" ? "text-emerald-800" : "text-stone-400"}`}>
                      {statusLabel(status)}
                    </span>
                    <span className="text-base leading-snug text-stone-900">
                      {item.letter ? <span className="font-semibold">{item.letter}. </span> : null}
                      {item.label}
                      {check?.note ? <span className="mt-1 block text-sm text-stone-700">{check.note}</span> : null}
                    </span>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
      <p className="mt-4 text-base text-stone-900">
        Date inspected: {formatInspectionDate(inspectedOn)}
        <span className="mx-2 text-stone-300">·</span>
        By: {inspectedBy || "—"}
      </p>
    </article>
  );
}
