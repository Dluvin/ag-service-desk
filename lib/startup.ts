import { prisma } from "./prisma";
import { slugify } from "./roles";

export const STARTUP_SEASON_YEAR = new Date().getFullYear();

export const STARTUP_CHECKS = [
  { key: "power", label: "Power and electrical", detail: "Panel, fuses, grounding, and last-tower stop." },
  { key: "alignment", label: "Alignment", detail: "Spans tracking straight; no tower lag." },
  { key: "sprinklers", label: "Sprinklers and nozzles", detail: "Plugs, worn nozzles, and hanging drops." },
  { key: "gearbox", label: "Gearboxes and drivetrain", detail: "Oil level, leaks, and u-joints." },
  { key: "tires", label: "Tires and towers", detail: "Pressure, rims, and motor mounts." },
  { key: "endgun", label: "End gun", detail: "Coupling, booster, and shutoff." },
  { key: "controls", label: "Control panel", detail: "Direction, speed, and percent timer." },
] as const;

export const INSPECTION_STATUS = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  PASSED: "PASSED",
  FAILED: "FAILED",
} as const;

export function inspectionLabel(status: string) {
  if (status === INSPECTION_STATUS.PASSED) return "Passed";
  if (status === INSPECTION_STATUS.FAILED) return "Failed — ticket opened";
  if (status === INSPECTION_STATUS.IN_PROGRESS) return "In progress";
  return "Not started";
}

export function checkLabel(check: { checkKey: string; label?: string | null }) {
  if (check.label) return check.label;
  return STARTUP_CHECKS.find((item) => item.key === check.checkKey)?.label ?? check.checkKey;
}

export async function ensureStartupTemplates(organizationId: string) {
  const existing = await prisma.startupCheckTemplate.findMany({
    where: { organizationId },
    orderBy: { sortOrder: "asc" },
  });
  if (existing.length > 0) return existing;
  await prisma.startupCheckTemplate.createMany({
    data: STARTUP_CHECKS.map((check, index) => ({
      organizationId,
      checkKey: check.key,
      label: check.label,
      detail: check.detail,
      sortOrder: index,
    })),
  });
  return prisma.startupCheckTemplate.findMany({
    where: { organizationId },
    orderBy: { sortOrder: "asc" },
  });
}

export function uniqueCheckKey(label: string, used: Set<string>) {
  let base = slugify(label) || "check";
  if (base.length < 2) base = "check";
  let key = base;
  let n = 2;
  while (used.has(key)) {
    key = `${base}-${n}`;
    n += 1;
  }
  return key;
}
