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

export type StartupCheckKey = (typeof STARTUP_CHECKS)[number]["key"];

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
