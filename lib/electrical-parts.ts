import data from "@/data/electrical-parts.json";

export type PartsColumn = { heading: string; items: string[] };

const HEADINGS: Record<string, string> = {
  "1": "Disconnects / fuses",
  "2": "Electrical fittings",
  "3": "Wire",
  "4": "Contactors",
  "5": "Gheen / underground fittings",
  "6": "Nuts & bolts",
  "7": "Flanges",
};

export const ELECTRICAL_PART_COLUMNS: PartsColumn[] = Object.keys(data.cols)
  .sort((a, b) => Number(a) - Number(b))
  .map((key) => ({
    heading: HEADINGS[key] ?? data.headers[key as keyof typeof data.headers] ?? key,
    items: data.cols[key as keyof typeof data.cols],
  }));
