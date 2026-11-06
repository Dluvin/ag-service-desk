export const INSPECTION_KINDS = ["point", "tower", "visit"] as const;
export type InspectionKind = (typeof INSPECTION_KINDS)[number];

export const CHECK_STATUSES = ["", "ok", "issue", "r", "lk", "lo"] as const;
export type CheckStatus = (typeof CHECK_STATUSES)[number];

export type CheckState = {
  status: CheckStatus;
  note: string;
};

export type CheckMap = Record<string, CheckState>;

export type InspectionItem = {
  id: string;
  letter: string;
  label: string;
  mode: "check" | "code";
  section: string;
};

export type HeaderField = {
  name: string;
  label: string;
};

export const MAX_TOWERS = 20;

export const PIVOT_BRANDS = ["Valley", "Reinke", "Zimmatic"] as const;

export type TowerDraft = {
  tireSize: string;
  gearMotorRpm: string;
  checks: CheckMap;
};

export type VisitDraft = {
  farmerId: string;
  qbListId: string;
  deskPivotId: string;
  inspectedOn: string;
  inspectedBy: string;
  serialNumber: string;
  brand: string;
  towerCount: number;
  packageItem: string;
  packageDescription: string;
  pivotId: string;
  modelNumber: string;
  fuseSize: string;
  hours: string;
  pointChecks: CheckMap;
  towers: TowerDraft[];
};

export type PackageInspectionLink = {
  id: string;
  kind: InspectionKind;
  customerName: string;
  inspectedOn: string;
  inspectedBy: string;
};

export type InspectionDraft = {
  customerKey: string;
  inspectedOn: string;
  inspectedBy: string;
  header: Record<string, string>;
  checks: CheckMap;
};

export const POINT_FIELDS: HeaderField[] = [
  { name: "pivotId", label: "Pivot ID" },
  { name: "serialNumber", label: "Pivot serial number" },
  { name: "modelNumber", label: "Model number" },
  { name: "fuseSize", label: "Pivot fuse size" },
  { name: "hours", label: "Hours" },
  { name: "towerCount", label: "Number of towers" },
];

export const TOWER_FIELDS: HeaderField[] = [
  { name: "pivotNumber", label: "Pivot number" },
  { name: "towerNumber", label: "Tower number" },
  { name: "tireSize", label: "Tire size" },
  { name: "gearMotorRpm", label: "Gear motor RPM" },
];

const POINT_ITEMS: InspectionItem[] = [
  { id: "swivel", letter: "A", section: "point", mode: "check", label: "Grease pivot swivel." },
  { id: "collector", letter: "B", section: "point", mode: "check", label: "Collector ring electrical connections and drain." },
  { id: "elbow", letter: "C", section: "point", mode: "check", label: "Drain pivot elbow." },
  { id: "anchor", letter: "D", section: "point", mode: "check", label: "Anchor bolts or chains." },
  { id: "bolts", letter: "E", section: "point", mode: "check", label: "Pivot point nuts and bolts for proper tightness." },
  { id: "gasket", letter: "F", section: "point", mode: "check", label: "Inspect condition of pivot riser pipe gasket." },
  { id: "light", letter: "", section: "general", mode: "check", label: "Running light operation check." },
  { id: "ground-rod", letter: "", section: "general", mode: "check", label: "Inspect for ground rod at each tow location." },
  { id: "tire-air", letter: "", section: "general", mode: "check", label: "Air pressure in towable pivot tires." },
  { id: "grounding", letter: "", section: "general", mode: "check", label: "Visual inspection for proper equipment grounding." },
  { id: "panel", letter: "", section: "general", mode: "check", label: "Electrical connections: control panel and cord connectors." },
  { id: "fuses", letter: "", section: "general", mode: "check", label: "Proper size fuses." },
  { id: "incoming", letter: "", section: "general", mode: "check", label: "Proper installation of incoming power wires." },
  { id: "aux", letter: "", section: "general", mode: "check", label: "Proper operation of auxiliary contacts on main disconnect." },
  { id: "pump", letter: "", section: "general", mode: "check", label: "Operation of pump shutdown circuit." },
  { id: "relays", letter: "", section: "general", mode: "check", label: "Relays are securely seated in socket bases." },
];

const TOWER_ITEMS: InspectionItem[] = [
  { id: "tire", letter: "", section: "tower", mode: "check", label: "Tire pressure." },
  { id: "contactors", letter: "", section: "tower", mode: "check", label: "Tower box contactors." },
  { id: "micros", letter: "", section: "tower", mode: "check", label: "Tower box micro switches." },
  { id: "box-wires", letter: "", section: "tower", mode: "check", label: "Tower box electrical connections." },
  { id: "overhang", letter: "", section: "tower", mode: "check", label: "Overhang cable inspection (last tower)." },
  { id: "sand", letter: "", section: "tower", mode: "check", label: "Pull sand trap, drain, clean, and reinstall." },
  { id: "booster", letter: "", section: "tower", mode: "check", label: "Drain booster pump." },
  { id: "ujoints", letter: "A", section: "drive", mode: "code", label: "U-joints." },
  { id: "input-bearings", letter: "B", section: "drive", mode: "code", label: "Gearbox input shaft bearings." },
  { id: "output-bearings", letter: "C", section: "drive", mode: "code", label: "Gearbox output shaft bearings and backlash." },
  { id: "gearbox-oil", letter: "D", section: "drive", mode: "code", label: "Drain water in gearbox and check oil level." },
  { id: "seals", letter: "E", section: "drive", mode: "code", label: "Gearbox input E1 and output seals E2." },
  { id: "lugs", letter: "F", section: "drive", mode: "code", label: "Lug bolts." },
  { id: "motor-wires", letter: "G", section: "drive", mode: "code", label: "Gear motor electrical connections." },
  { id: "motor-seals", letter: "H", section: "drive", mode: "code", label: "Gear motor output shaft seals." },
  { id: "boots", letter: "I", section: "drive", mode: "code", label: "Flex boots." },
  { id: "span", letter: "J", section: "drive", mode: "code", label: "Span drain." },
  { id: "hitch", letter: "K", section: "drive", mode: "code", label: "Ball hitch tightness." },
  { id: "span-ground", letter: "L", section: "drive", mode: "code", label: "Grounding between towers." },
  { id: "shield", letter: "M", section: "drive", mode: "code", label: "Inspect drive shaft shield placement." },
  { id: "mount-bolts", letter: "N", section: "drive", mode: "code", label: "Proper tightness of gearbox mounting bolts." },
];

export function isInspectionKind(value: string): value is InspectionKind {
  return value === "point" || value === "tower" || value === "visit";
}

export function inspectionTitle(kind: InspectionKind) {
  if (kind === "tower") return "“One Star” tower inspection";
  if (kind === "visit") return "Pivot inspection";
  return "Pivot point inspection";
}

export function inspectionDiagram(kind: InspectionKind) {
  return kind === "tower" ? "/inspection-diagrams/tower-diagram.png" : "/inspection-diagrams/pivot-point-diagram.png";
}

export function inspectionDiagramAlt(kind: InspectionKind) {
  return kind === "tower"
    ? "Tower diagram with forward and reverse gearbox callouts."
    : "Pivot point diagram with callouts A through F.";
}

export function inspectionFields(kind: InspectionKind) {
  if (kind === "tower") return TOWER_FIELDS;
  return POINT_FIELDS;
}

export function inspectionItems(kind: InspectionKind) {
  if (kind === "tower") return TOWER_ITEMS;
  return POINT_ITEMS;
}

export function inspectionSections(kind: InspectionKind) {
  if (kind === "tower") {
    return [
      { id: "tower", title: "Tower checks", hint: "Tap OK when the item is good. Tap Issue to write what you found." },
      { id: "drive", title: "Gearbox and drive", hint: "R replace, LK leaks, LO loose. The note is the blank line on the paper form." },
    ];
  }
  return [
    { id: "point", title: "Pivot point", hint: "Letters match the diagram." },
    { id: "general", title: "Electrical and general", hint: "Tap OK when the item is good. Tap Issue to write what you found." },
  ];
}

export function inspectionToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

export function formatInspectionDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || "—";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function readHeader(raw: string) {
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const header: Record<string, string> = {};
    for (const [key, item] of Object.entries(value)) {
      if (typeof item === "string") header[key] = item;
    }
    return header;
  } catch {
    return {};
  }
}

export function readChecks(raw: string): CheckMap {
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const checks: CheckMap = {};
    for (const [id, item] of Object.entries(value)) {
      if (!item || typeof item !== "object") continue;
      const record = item as { status?: unknown; note?: unknown };
      const status = CHECK_STATUSES.find((entry) => entry === record.status) ?? "";
      const note = typeof record.note === "string" ? record.note : "";
      if (status || note) checks[id] = { status, note };
    }
    return checks;
  } catch {
    return {};
  }
}

export function statusLabel(status: CheckStatus) {
  if (status === "ok") return "OK";
  if (status === "issue") return "Issue";
  if (status === "r") return "R";
  if (status === "lk") return "LK";
  if (status === "lo") return "LO";
  return "—";
}

export function statusNeedsAttention(status: CheckStatus) {
  return status === "issue" || status === "r" || status === "lk" || status === "lo";
}

export function attentionCount(checks: CheckMap) {
  return Object.values(checks).filter((item) => statusNeedsAttention(item.status)).length;
}

export function parseTowerCount(value: string) {
  const count = Number(String(value).trim());
  if (!Number.isInteger(count) || count < 1 || count > MAX_TOWERS) return null;
  return count;
}

export function emptyTower(): TowerDraft {
  return { tireSize: "", gearMotorRpm: "", checks: {} };
}

export function resizeTowers(towers: TowerDraft[], count: number) {
  const next = towers.slice(0, count).map((tower) => ({
    tireSize: tower.tireSize,
    gearMotorRpm: tower.gearMotorRpm,
    checks: tower.checks,
  }));
  while (next.length < count) next.push(emptyTower());
  return next;
}

export function sanitizeCheckMap(raw: unknown, kind: "point" | "tower"): CheckMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const allowed = new Map(inspectionItems(kind).map((item) => [item.id, item.mode]));
  const checks: CheckMap = {};
  for (const [id, item] of Object.entries(raw as Record<string, unknown>)) {
    const mode = allowed.get(id);
    if (!mode || !item || typeof item !== "object") continue;
    const record = item as { status?: unknown; note?: unknown };
    const status = CHECK_STATUSES.find((entry) => entry === record.status) ?? "";
    const allowedStatus: CheckStatus[] = mode === "code" ? ["", "ok", "r", "lk", "lo"] : ["", "ok", "issue"];
    const safeStatus = allowedStatus.includes(status) ? status : "";
    const note = typeof record.note === "string" ? cleanLine(record.note, 400) : "";
    if (safeStatus || note) checks[id] = { status: safeStatus, note };
  }
  return checks;
}

export function readVisit(headerJson: string, checksJson: string): VisitDraft {
  const header = readHeader(headerJson);
  const towerCount = parseTowerCount(header.towerCount ?? "") ?? 1;
  let pointChecks: CheckMap = {};
  let towers: TowerDraft[] = [];
  try {
    const value = JSON.parse(checksJson) as unknown;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const record = value as { point?: unknown; towers?: unknown };
      pointChecks = sanitizeCheckMap(record.point, "point");
      if (Array.isArray(record.towers)) {
        towers = record.towers.slice(0, MAX_TOWERS).map((tower) => {
          const row = tower && typeof tower === "object" ? (tower as Record<string, unknown>) : {};
          return {
            tireSize: typeof row.tireSize === "string" ? cleanLine(row.tireSize, 80) : "",
            gearMotorRpm: typeof row.gearMotorRpm === "string" ? cleanLine(row.gearMotorRpm, 80) : "",
            checks: sanitizeCheckMap(row.checks, "tower"),
          };
        });
      }
    }
  } catch {
    pointChecks = {};
  }
  return {
    farmerId: "",
    qbListId: header.qbListId ?? "",
    deskPivotId: "",
    inspectedOn: "",
    inspectedBy: "",
    serialNumber: header.serialNumber ?? "",
    brand: header.brand ?? "",
    towerCount,
    packageItem: header.packageItem ?? "",
    packageDescription: header.packageDescription ?? "",
    pivotId: header.pivotId ?? "",
    modelNumber: header.modelNumber ?? "",
    fuseSize: header.fuseSize ?? "",
    hours: header.hours ?? "",
    pointChecks,
    towers: resizeTowers(towers, towerCount),
  };
}

export function visitAttention(visit: Pick<VisitDraft, "pointChecks" | "towers">) {
  return attentionCount(visit.pointChecks) + visit.towers.reduce((sum, tower) => sum + attentionCount(tower.checks), 0);
}

export function inspectionSubtitle(kind: InspectionKind, header: Record<string, string>) {
  if (kind === "visit") {
    return [header.brand, header.serialNumber, header.towerCount ? `${header.towerCount} towers` : ""].filter(Boolean).join(" · ");
  }
  if (kind === "tower") {
    const pivot = header.pivotNumber?.trim() || "No pivot number";
    const tower = header.towerNumber?.trim() ? `Tower ${header.towerNumber.trim()}` : "";
    return [pivot, tower].filter(Boolean).join(" · ");
  }
  const pivot = header.pivotId?.trim() || "No pivot ID";
  const towers = header.towerCount?.trim() ? `${header.towerCount.trim()} towers` : "";
  return [pivot, towers].filter(Boolean).join(" · ");
}

export function cleanLine(value: string, max: number) {
  return value.replace(/[\u0000-\u001F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
