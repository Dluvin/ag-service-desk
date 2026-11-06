"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { InspectionCustomerFields } from "@/components/InspectionCustomerFields";
import { saveVisitAction } from "@/lib/inspection-actions";
import {
  PIVOT_BRANDS,
  inspectionDiagram,
  inspectionDiagramAlt,
  inspectionItems,
  inspectionSections,
  parseTowerCount,
  resizeTowers,
  type CheckMap,
  type CheckStatus,
  type InspectionItem,
  type TowerDraft,
  type VisitDraft,
} from "@/lib/inspection-form";
import type { InspectionCustomerOption } from "@/lib/inspections";

const fieldClass = "h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base text-stone-900";

type SerialMatch = {
  item: string;
  description: string;
  brand: string;
  towerCount: string;
};

export function InspectionWizard({
  organizationId,
  customerSource = "static",
  customers,
  visit,
  id,
  initialStep = 0,
}: {
  organizationId: string;
  customerSource?: "static" | "quickbooks";
  customers: InspectionCustomerOption[];
  visit: VisitDraft;
  id?: string;
  initialStep?: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState(initialStep);
  const [savedId, setSavedId] = useState(id);
  const [error, setError] = useState("");
  const [farmerId, setFarmerId] = useState(visit.farmerId);
  const [qbListId, setQbListId] = useState(visit.qbListId);
  const [deskPivotId, setDeskPivotId] = useState(visit.deskPivotId);
  const [inspectedOn, setInspectedOn] = useState(visit.inspectedOn);
  const [inspectedBy, setInspectedBy] = useState(visit.inspectedBy);
  const [serialNumber, setSerialNumber] = useState(visit.serialNumber);
  const [brand, setBrand] = useState(visit.brand || "Valley");
  const [towerCount, setTowerCount] = useState(id ? String(visit.towerCount) : "");
  const [packageItem, setPackageItem] = useState(visit.packageItem);
  const [packageDescription, setPackageDescription] = useState(visit.packageDescription);
  const [pivotId, setPivotId] = useState(visit.pivotId);
  const [modelNumber, setModelNumber] = useState(visit.modelNumber);
  const [fuseSize, setFuseSize] = useState(visit.fuseSize);
  const [hours, setHours] = useState(visit.hours);
  const [pointChecks, setPointChecks] = useState<CheckMap>(visit.pointChecks);
  const [towers, setTowers] = useState<TowerDraft[]>(visit.towers);
  const [matches, setMatches] = useState<SerialMatch[]>([]);
  const [lookupNote, setLookupNote] = useState("");
  const towerCountRef = useRef(towerCount);
  const brandTouched = useRef(Boolean(id));
  towerCountRef.current = towerCount;

  const farmer = useMemo(() => customers.find((row) => row.id === farmerId) ?? null, [customers, farmerId]);
  const selectedLabel = useMemo(() => {
    if (customerSource === "quickbooks") return qbListId ? "QuickBooks customer" : "";
    return farmer?.label ?? "";
  }, [customerSource, farmer?.label, qbListId]);
  const count = parseTowerCount(towerCount) ?? visit.towerCount;
  const towerIndex = step - 2;

  useEffect(() => {
    const serial = serialNumber.trim();
    if (serial.length < 3) {
      setMatches([]);
      setLookupNote("");
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void fetch(`/api/inspections/lookup?serial=${encodeURIComponent(serial)}`)
        .then((response) => response.json())
        .then((data: { matches?: SerialMatch[] }) => {
          if (cancelled) return;
          const found = data.matches ?? [];
          setMatches(found);
          setLookupNote(found.length ? "" : "No package found for that serial. You can still enter it.");
          if (found.length === 1) {
            const match = found[0];
            setPackageItem(match.item);
            setPackageDescription(match.description);
            if (!brandTouched.current && match.brand) setBrand(match.brand);
            if (!parseTowerCount(towerCountRef.current) && match.towerCount) setTowerCount(match.towerCount);
          }
        })
        .catch(() => {
          if (!cancelled) setLookupNote("");
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [serialNumber]);

  function applyMatch(match: SerialMatch, force: boolean) {
    setPackageItem(match.item);
    setPackageDescription(match.description);
    setMatches([]);
    setLookupNote("");
    if ((force || !brandTouched.current) && match.brand) setBrand(match.brand);
    if (force) brandTouched.current = true;
    if (force || !parseTowerCount(towerCount)) setTowerCount(match.towerCount || towerCount);
  }

  function payload(nextCount: number, nextTowers: TowerDraft[]): VisitDraft & { id?: string } {
    return {
      id: savedId,
      farmerId,
      qbListId,
      deskPivotId,
      inspectedOn,
      inspectedBy,
      serialNumber,
      brand,
      towerCount: nextCount,
      packageItem,
      packageDescription,
      pivotId,
      modelNumber,
      fuseSize,
      hours,
      pointChecks,
      towers: nextTowers,
    };
  }

  function go(target: number | "done") {
    if (customerSource === "quickbooks" ? !qbListId : !farmerId) {
      return setError(customerSource === "quickbooks" ? "Choose a QuickBooks customer." : "Choose a customer.");
    }
    if (!brand.trim()) return setError("Enter the brand.");
    const nextCount = parseTowerCount(towerCount);
    if (!nextCount) return setError("Enter the number of towers, from 1 to 20.");
    if (!inspectedOn) return setError("Enter the date inspected.");
    if (!inspectedBy.trim()) return setError("Enter who did the inspection.");
    const nextTowers = resizeTowers(towers, nextCount);
    setError("");
    startTransition(async () => {
      const result = await saveVisitAction(payload(nextCount, nextTowers));
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setTowers(nextTowers);
      setSavedId(result.id);
      if (target === "done") {
        router.push(`/inspections/${result.id}?saved=1`);
        return;
      }
      setStep(target);
      router.replace(`/inspections/${result.id}/edit?step=${target}`);
    });
  }

  const lastStep = count + 1;
  const nextLabel =
    step === 0
      ? "Next · create work order"
      : step === 1
        ? `Next · Tower 1 of ${count}`
        : step >= lastStep
          ? `Save · Tower ${count} of ${count}`
          : `Next · Tower ${towerIndex + 1} of ${count}`;

  return (
    <div className="grid gap-4">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-800">
          {step === 0 ? "Start" : step === 1 ? "Pivot point" : `Tower ${towerIndex + 1} of ${count}`}
        </p>
        <h1 className="font-display text-3xl">
          {step === 0 ? "Pivot" : step === 1 ? "Pivot point inspection" : "Tower inspection"}
        </h1>
        {step > 0 ? (
          <p className="mt-1 text-sm text-stone-600">
            {[selectedLabel, brand, serialNumber].filter(Boolean).join(" · ")}
          </p>
        ) : (
          <p className="mt-1 text-sm text-stone-600">
            Pick the customer and pivot. Saving the first step opens a scheduled work order on Dispatch.
            {customerSource === "quickbooks"
              ? " Customer names come from QuickBooks and stay cached on this device for offline field use."
              : ""}
          </p>
        )}
      </div>
      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
      {step === 0 ? (
        <Setup
          organizationId={organizationId}
          customerSource={customerSource}
          customers={customers}
          farmerId={farmerId}
          qbListId={qbListId}
          deskPivotId={deskPivotId}
          onFarmer={(value) => {
            setFarmerId(value);
            if (value) setError("");
          }}
          onQbCustomer={(value) => {
            setQbListId(value);
            if (value) setError("");
          }}
          onPivot={(pivot) => {
            setDeskPivotId(pivot?.id ?? "");
            if (!pivot) return;
            setPivotId(pivot.name);
            if (pivot.serialNumber) setSerialNumber(pivot.serialNumber);
            if (pivot.packageItem) {
              setPackageItem(pivot.packageItem);
              setPackageDescription(pivot.packageDescription ?? "");
              if (pivot.packageBrand && !brandTouched.current) setBrand(pivot.packageBrand);
              if (pivot.packageTowerCount != null && !parseTowerCount(towerCountRef.current)) {
                setTowerCount(String(pivot.packageTowerCount));
              }
            }
          }}
          serialNumber={serialNumber}
          onSerial={(value) => {
            setSerialNumber(value);
            setPackageItem("");
            setPackageDescription("");
          }}
          matches={matches}
          lookupNote={lookupNote}
          onPick={(match) => applyMatch(match, true)}
          packageDescription={packageDescription}
          brand={brand}
          onBrand={(value) => {
            brandTouched.current = true;
            setBrand(value);
          }}
          towerCount={towerCount}
          onTowerCount={setTowerCount}
          inspectedOn={inspectedOn}
          onDate={setInspectedOn}
          inspectedBy={inspectedBy}
          onBy={setInspectedBy}
        />
      ) : null}
      {step === 1 ? (
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Pivot ID" value={pivotId} onChange={setPivotId} />
            <Field label="Model number" value={modelNumber} onChange={setModelNumber} />
            <Field label="Pivot fuse size" value={fuseSize} onChange={setFuseSize} />
            <Field label="Hours" value={hours} onChange={setHours} />
          </div>
          <Diagram kind="point" />
          <CheckList kind="point" checks={pointChecks} onChange={setPointChecks} />
        </div>
      ) : null}
      {step > 1 && towers[towerIndex] ? (
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Tire size"
              value={towers[towerIndex].tireSize}
              onChange={(value) => updateTower(towerIndex, { tireSize: value })}
            />
            <Field
              label="Gear motor RPM"
              value={towers[towerIndex].gearMotorRpm}
              onChange={(value) => updateTower(towerIndex, { gearMotorRpm: value })}
            />
          </div>
          <Diagram kind="tower" />
          <CheckList
            kind="tower"
            checks={towers[towerIndex].checks}
            onChange={(checks) => updateTower(towerIndex, { checks })}
          />
        </div>
      ) : null}
      <div className="sticky bottom-0 -mx-1 flex items-center gap-3 border-t border-stone-200 bg-[var(--desk-surface)]/95 px-1 py-3 backdrop-blur">
        {step > 0 ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => go(step - 1)}
            className="h-12 rounded-xl border border-stone-300 bg-white px-4 text-sm text-stone-800 disabled:opacity-60"
          >
            Back
          </button>
        ) : (
          <Link
            href={savedId ? `/inspections/${savedId}` : "/inspections"}
            className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-800"
          >
            Cancel
          </Link>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => go(step >= lastStep ? "done" : step + 1)}
          className="h-12 flex-1 rounded-xl bg-emerald-800 text-base font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : nextLabel}
        </button>
      </div>
    </div>
  );

  function updateTower(index: number, patch: Partial<TowerDraft>) {
    setTowers((current) => current.map((tower, towerAt) => (towerAt === index ? { ...tower, ...patch } : tower)));
  }
}

function BrandField({ brand, onBrand }: { brand: string; onBrand: (value: string) => void }) {
  const named = (PIVOT_BRANDS as readonly string[]).includes(brand);
  const choice = named ? brand : "Other";
  return (
    <div className="grid gap-3">
      <label className="grid gap-1 text-sm text-stone-700">
        Brand
        <select
          value={choice}
          onChange={(event) => onBrand(event.target.value === "Other" ? "" : event.target.value)}
          className={fieldClass}
        >
          {PIVOT_BRANDS.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
          <option value="Other">Other</option>
        </select>
      </label>
      {choice === "Other" ? (
        <label className="grid gap-1 text-sm text-stone-700">
          Other brand
          <input
            value={brand}
            onChange={(event) => onBrand(event.target.value)}
            placeholder="Brand name"
            autoComplete="off"
            className={fieldClass}
          />
        </label>
      ) : null}
    </div>
  );
}

function Setup({
  organizationId,
  customerSource,
  customers,
  farmerId,
  qbListId,
  deskPivotId,
  onFarmer,
  onQbCustomer,
  onPivot,
  serialNumber,
  onSerial,
  matches,
  lookupNote,
  onPick,
  packageDescription,
  brand,
  onBrand,
  towerCount,
  onTowerCount,
  inspectedOn,
  onDate,
  inspectedBy,
  onBy,
}: {
  organizationId: string;
  customerSource: "static" | "quickbooks";
  customers: InspectionCustomerOption[];
  farmerId: string;
  qbListId: string;
  deskPivotId: string;
  onFarmer: (value: string) => void;
  onQbCustomer: (value: string) => void;
  onPivot: (
    pivot: {
      id: string;
      name: string;
      serialNumber: string | null;
      packageItem: string | null;
      packageDescription: string | null;
      packageBrand: string | null;
      packageTowerCount: number | null;
    } | null,
  ) => void;
  serialNumber: string;
  onSerial: (value: string) => void;
  matches: SerialMatch[];
  lookupNote: string;
  onPick: (match: SerialMatch) => void;
  packageDescription: string;
  brand: string;
  onBrand: (value: string) => void;
  towerCount: string;
  onTowerCount: (value: string) => void;
  inspectedOn: string;
  onDate: (value: string) => void;
  inspectedBy: string;
  onBy: (value: string) => void;
}) {
  return (
    <div className="grid gap-4">
      {customerSource === "static" && customers.length === 0 ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          No customers on file yet. Add a customer under Customers, then come back.
        </p>
      ) : null}
      <InspectionCustomerFields
        organizationId={organizationId}
        customerSource={customerSource}
        staticCustomers={customers}
        farmerId={farmerId}
        qbListId={qbListId}
        deskPivotId={deskPivotId}
        onFarmer={onFarmer}
        onQbCustomer={onQbCustomer}
        onPivot={onPivot}
      />
      <label className="grid gap-1 text-sm text-stone-700">
        Serial number, if known
        <input value={serialNumber} onChange={(event) => onSerial(event.target.value)} autoComplete="off" className={fieldClass} />
      </label>
      {packageDescription ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">{packageDescription}</p>
      ) : null}
      {matches.length > 1 ? (
        <ul className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          {matches.map((match) => (
            <li key={match.item} className="border-b border-stone-100 last:border-b-0">
              <button type="button" onClick={() => onPick(match)} className="w-full px-4 py-3 text-left hover:bg-emerald-50">
                <span className="block text-base text-stone-900">{match.description}</span>
                <span className="text-sm text-stone-500">
                  {[match.item, match.brand, match.towerCount ? `${match.towerCount} towers` : ""].filter(Boolean).join(" · ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {lookupNote ? <p className="text-sm text-stone-500">{lookupNote}</p> : null}
      <BrandField brand={brand} onBrand={onBrand} />
      <label className="grid gap-1 text-sm text-stone-700">
        Number of towers or spans
        <input
          value={towerCount}
          onChange={(event) => onTowerCount(event.target.value)}
          inputMode="numeric"
          className={fieldClass}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm text-stone-700">
          Date inspected / scheduled
          <input type="date" value={inspectedOn} onChange={(event) => onDate(event.target.value)} className={fieldClass} />
        </label>
        <label className="grid gap-1 text-sm text-stone-700">
          By
          <input value={inspectedBy} onChange={(event) => onBy(event.target.value)} autoComplete="name" className={fieldClass} />
        </label>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-sm text-stone-700">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} autoComplete="off" className={fieldClass} />
    </label>
  );
}

function Diagram({ kind }: { kind: "point" | "tower" }) {
  return (
    <details className="rounded-xl border border-stone-200 bg-white p-3">
      <summary className="cursor-pointer text-base font-medium text-stone-900">Diagram</summary>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={inspectionDiagram(kind)} alt={inspectionDiagramAlt(kind)} className="mt-3 w-full rounded-lg bg-white" />
    </details>
  );
}

function CheckList({
  kind,
  checks,
  onChange,
}: {
  kind: "point" | "tower";
  checks: CheckMap;
  onChange: (checks: CheckMap) => void;
}) {
  const items = inspectionItems(kind);
  return (
    <div className="grid gap-5">
      {inspectionSections(kind).map((section) => (
        <section key={section.id} className="grid gap-3">
          <div>
            <h2 className="text-xl">{section.title}</h2>
            <p className="text-sm text-stone-600">{section.hint}</p>
          </div>
          {items
            .filter((item) => item.section === section.id)
            .map((item) => (
              <CheckRow
                key={item.id}
                item={item}
                status={checks[item.id]?.status ?? ""}
                note={checks[item.id]?.note ?? ""}
                onStatus={(status) => {
                  const previous = checks[item.id] ?? { status: "", note: "" };
                  onChange({ ...checks, [item.id]: { ...previous, status: previous.status === status ? "" : status } });
                }}
                onNote={(note) => {
                  const previous = checks[item.id] ?? { status: "", note: "" };
                  onChange({ ...checks, [item.id]: { ...previous, note } });
                }}
              />
            ))}
        </section>
      ))}
    </div>
  );
}

function statusButtonClass(selected: boolean, tone: "ok" | "bad") {
  if (!selected) return "border-stone-300 bg-white text-stone-800";
  return tone === "ok" ? "border-emerald-700 bg-emerald-800 text-white" : "border-amber-700 bg-amber-800 text-white";
}

function CheckRow({
  item,
  status,
  note,
  onStatus,
  onNote,
}: {
  item: InspectionItem;
  status: CheckStatus;
  note: string;
  onStatus: (status: CheckStatus) => void;
  onNote: (note: string) => void;
}) {
  const coded = item.mode === "code";
  const [noteOpen, setNoteOpen] = useState(false);
  const showNote = coded || status === "issue" || noteOpen || note.length > 0;
  const choices: { status: CheckStatus; label: string; tone: "ok" | "bad" }[] = coded
    ? [
        { status: "ok", label: "OK", tone: "ok" },
        { status: "r", label: "Replace", tone: "bad" },
        { status: "lk", label: "Leaks", tone: "bad" },
        { status: "lo", label: "Loose", tone: "bad" },
      ]
    : [
        { status: "ok", label: "OK", tone: "ok" },
        { status: "issue", label: "Issue", tone: "bad" },
      ];
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3">
      <p className="text-base leading-snug text-stone-900">
        {item.letter ? <span className="mr-2 font-semibold text-emerald-900">{item.letter}.</span> : null}
        {item.label}
      </p>
      <div className={`mt-3 grid gap-2 ${coded ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}>
        {choices.map((choice) => (
          <button
            key={choice.status}
            type="button"
            aria-pressed={status === choice.status}
            onClick={() => onStatus(choice.status)}
            className={`min-h-12 rounded-xl border px-2 text-sm font-medium ${statusButtonClass(status === choice.status, choice.tone)}`}
          >
            {choice.label}
          </button>
        ))}
      </div>
      {showNote ? (
        <input
          value={note}
          onChange={(event) => onNote(event.target.value)}
          placeholder="Note"
          autoComplete="off"
          className="mt-3 h-12 w-full rounded-xl border border-stone-300 px-3 text-base text-stone-900"
        />
      ) : status === "ok" ? (
        <button type="button" onClick={() => setNoteOpen(true)} className="mt-2 text-sm text-emerald-800">
          Add note
        </button>
      ) : null}
    </div>
  );
}
