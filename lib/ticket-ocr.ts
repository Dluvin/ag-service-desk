import { ocrSystemPrompt, ocrUserPrompt, parseOcrTemplateKey, type OcrTemplateKey } from "./ocr-templates";

export type OcrLineItem = {
  quantity: number;
  name: string;
  sku: string;
  notes: string;
};

export type TicketOcrDraft = {
  title: string;
  description: string;
  customer: string;
  jobSite: string;
  technician: string;
  date: string;
  invoiceNumber: string;
  invoiceAmount: string;
  rawText: string;
  paperNumber: string;
  farmName: string;
  contact: string;
  contactPhone: string;
  unitType: string;
  unitId: string;
  ageOfEq: string;
  make: string;
  model: string;
  problem: string;
  servicePerformed: string;
  warranty: string;
  completionNotice: string;
  partsOnTruck: string;
  crew: string;
  startTime: string;
  stopTime: string;
  laborHours: string;
  serviceTruck: string;
  parts: OcrLineItem[];
  labor: OcrLineItem[];
  equipment: OcrLineItem[];
};

export function emptyOcrDraft(): TicketOcrDraft {
  return {
    title: "",
    description: "",
    customer: "",
    jobSite: "",
    technician: "",
    date: "",
    invoiceNumber: "",
    invoiceAmount: "",
    rawText: "",
    paperNumber: "",
    farmName: "",
    contact: "",
    contactPhone: "",
    unitType: "",
    unitId: "",
    ageOfEq: "",
    make: "",
    model: "",
    problem: "",
    servicePerformed: "",
    warranty: "",
    completionNotice: "",
    partsOnTruck: "",
    crew: "",
    startTime: "",
    stopTime: "",
    laborHours: "",
    serviceTruck: "",
    parts: [],
    labor: [],
    equipment: [],
  };
}

export function visionOcrConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function visionOcrModel() {
  return process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4o-mini";
}

const OCR_MAX_BYTES = 8 * 1024 * 1024;

export function ocrImageFromForm(formData: FormData) {
  const file = formData.get("ocrPhoto");
  return file instanceof File && file.size > 0 ? file : null;
}

export function validateOcrImage(file: File) {
  if (file.size > OCR_MAX_BYTES) return { error: `${file.name} is over 8 MB.` };
  const type = file.type.toLowerCase();
  const ok =
    type.startsWith("image/") ||
    /\.(jpe?g|png|webp|gif)$/i.test(file.name);
  if (!ok) return { error: "Use a JPEG, PNG, WebP, or GIF photo of the handwritten ticket." };
  if (/\.(heic|heif)$/i.test(file.name) || type.includes("heic") || type.includes("heif")) {
    return { error: "HEIC photos need to be saved as JPEG first, then scanned." };
  }
  return {};
}

function mimeForOcr(file: File) {
  if (file.type && file.type !== "application/octet-stream") return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

function asItem(value: unknown): OcrLineItem | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const name = String(row.name ?? row.description ?? "").trim();
  if (!name) return null;
  const qty = Number(row.quantity ?? row.hours ?? 1);
  return {
    quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
    name: name.slice(0, 180),
    sku: String(row.sku ?? row.part ?? row.partNumber ?? "").trim().slice(0, 80),
    notes: String(row.notes ?? "").trim().slice(0, 240),
  };
}

function asList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(asItem).filter((row): row is OcrLineItem => Boolean(row)).slice(0, 40);
}

export function parseOcrDraft(raw: unknown): TicketOcrDraft {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const draft = emptyOcrDraft();
  draft.paperNumber = String(src.paperNumber ?? src.number ?? src.ticketNumber ?? "").trim().slice(0, 40);
  draft.farmName = String(src.farmName ?? src.farm ?? "").trim().slice(0, 180);
  draft.contact = String(src.contact ?? "").trim().slice(0, 120);
  draft.contactPhone = String(src.contactPhone ?? src.phone ?? "").trim().slice(0, 40);
  draft.unitType = String(src.unitType ?? "").trim().slice(0, 40);
  draft.unitId = String(src.unitId ?? "").trim().slice(0, 80);
  draft.ageOfEq = String(src.ageOfEq ?? src.age ?? "").trim().slice(0, 40);
  draft.make = String(src.make ?? "").trim().slice(0, 80);
  draft.model = String(src.model ?? "").trim().slice(0, 80);
  draft.problem = String(src.problem ?? src.describeProblem ?? "").trim().slice(0, 2000);
  draft.servicePerformed = String(src.servicePerformed ?? src.detailService ?? "").trim().slice(0, 2000);
  draft.warranty = String(src.warranty ?? src.holdForWarranty ?? "").trim().slice(0, 20);
  draft.completionNotice = String(src.completionNotice ?? src.completionNotification ?? "").trim().slice(0, 20);
  draft.partsOnTruck = String(src.partsOnTruck ?? "").trim().slice(0, 20);
  draft.crew = String(src.crew ?? src.who ?? "").trim().slice(0, 180);
  draft.startTime = String(src.startTime ?? "").trim().slice(0, 40);
  draft.stopTime = String(src.stopTime ?? "").trim().slice(0, 40);
  draft.laborHours = String(src.laborHours ?? "").trim().slice(0, 20);
  draft.serviceTruck = String(src.serviceTruck ?? "").trim().slice(0, 20);
  draft.customer = String(src.customer ?? src.billTo ?? "").trim().slice(0, 180);
  draft.jobSite = String(src.jobSite ?? src.site ?? draft.farmName).trim().slice(0, 180);
  draft.technician = String(src.technician ?? src.tech ?? draft.crew).trim().slice(0, 120);
  draft.date = String(src.date ?? src.dateServiceRequested ?? src.dateWorked ?? "").trim().slice(0, 40);
  draft.invoiceNumber = String(src.invoiceNumber ?? src.invoice ?? "").trim().slice(0, 80);
  draft.invoiceAmount = String(src.invoiceAmount ?? src.totalToInvoice ?? "").trim().slice(0, 20);
  draft.rawText = String(src.rawText ?? src.text ?? "").trim().slice(0, 8000);
  draft.parts = asList(src.parts);
  draft.labor = asList(src.labor);
  draft.equipment = asList(src.equipment);
  if (Array.isArray(src.equipmentUsed)) {
    for (const name of src.equipmentUsed) {
      const label = String(name ?? "").trim();
      if (label && !draft.equipment.some((row) => row.name.toLowerCase() === label.toLowerCase())) {
        draft.equipment.push({ quantity: 1, name: label, sku: "", notes: "" });
      }
    }
  }
  if (draft.laborHours && draft.labor.length === 0) {
    const hours = Number(draft.laborHours);
    draft.labor.push({
      quantity: Number.isFinite(hours) && hours > 0 ? hours : 1,
      name: draft.crew || draft.technician || "Labor",
      sku: "",
      notes: [draft.startTime && `Start ${draft.startTime}`, draft.stopTime && `Stop ${draft.stopTime}`]
        .filter(Boolean)
        .join(" · "),
    });
  }
  draft.title = String(src.title ?? draft.problem ?? "").trim().slice(0, 180);
  const descriptionBits = [
    draft.problem && `Problem: ${draft.problem}`,
    draft.servicePerformed && `Service performed: ${draft.servicePerformed}`,
    draft.paperNumber && `Paper # ${draft.paperNumber}`,
    draft.unitType && `Unit: ${draft.unitType}${draft.unitId ? ` ${draft.unitId}` : ""}`,
    (draft.make || draft.model) && `Make/model: ${[draft.make, draft.model].filter(Boolean).join(" ")}`,
    draft.ageOfEq && `Age of eq: ${draft.ageOfEq}`,
  ].filter(Boolean);
  draft.description = String(src.description ?? descriptionBits.join("\n")).trim().slice(0, 4000);
  if (!draft.title && draft.description) draft.title = draft.description.slice(0, 80);
  if (!draft.jobSite && draft.farmName) draft.jobSite = draft.farmName;
  return draft;
}

export function parseOcrDraftJson(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return emptyOcrDraft();
  try {
    return parseOcrDraft(JSON.parse(trimmed) as unknown);
  } catch {
    return emptyOcrDraft();
  }
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced?.[1] ?? text).trim();
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The scan did not return a ticket.");
  return JSON.parse(body.slice(start, end + 1)) as unknown;
}

export type OcrScanContext = {
  templateKey?: OcrTemplateKey;
  fieldNotes?: string;
  sampleImages?: { bytes: Buffer; mimeType: string }[];
};

export async function readHandwrittenTicket(
  input: { bytes: Buffer; mimeType: string } & OcrScanContext,
): Promise<TicketOcrDraft> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Handwritten import is not configured. Set OPENAI_API_KEY on the server.");
  }
  const samples = (input.sampleImages ?? []).slice(0, 2);
  const templateKey = parseOcrTemplateKey(input.templateKey);
  const imageParts = [
    ...samples.map((sample) => ({
      type: "image_url" as const,
      image_url: { url: `data:${sample.mimeType};base64,${sample.bytes.toString("base64")}` },
    })),
    {
      type: "image_url" as const,
      image_url: { url: `data:${input.mimeType};base64,${input.bytes.toString("base64")}` },
    },
  ];
  const base = (process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, "");
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: visionOcrModel(),
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: ocrSystemPrompt({
            templateKey,
            fieldNotes: input.fieldNotes ?? "",
            sampleCount: samples.length,
          }),
        },
        {
          role: "user",
          content: [{ type: "text", text: ocrUserPrompt(samples.length) }, ...imageParts],
        },
      ],
    }),
  });
  const payload = (await response.json()) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };
  if (!response.ok) {
    throw new Error(payload.error?.message || `Scan failed (${response.status}).`);
  }
  const content = payload.choices?.[0]?.message?.content ?? "";
  return parseOcrDraft(extractJson(content));
}

export async function readHandwrittenTicketFile(file: File, context: OcrScanContext = {}) {
  const invalid = validateOcrImage(file);
  if (invalid.error) throw new Error(invalid.error);
  const bytes = Buffer.from(await file.arrayBuffer());
  return readHandwrittenTicket({ bytes, mimeType: mimeForOcr(file), ...context });
}
