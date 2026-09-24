import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "./prisma";
import { uploadDir } from "./ticket-photos";
import { DEFAULT_OCR_TEMPLATE, parseOcrTemplateKey, type OcrTemplateKey } from "./ocr-templates";
import { resolveEntitlements } from "./plans";

export const MAX_OCR_SAMPLES = 2;
export const MAX_OCR_SAMPLE_BYTES = 8 * 1024 * 1024;

export type OrgOcrSample = {
  id: string;
  fileName: string;
  mimeType: string;
};

export type OrgOcrSettings = {
  templateKey: OcrTemplateKey;
  fieldNotes: string;
  samples: OrgOcrSample[];
  ocrOverride: boolean | null;
  ocrOn: boolean;
  boxesConfirmedAt: string | null;
  firstScanAt: string | null;
  fieldListReviewedAt: string | null;
};

type ColumnInfo = { name: string };

function asNullableBool(value: unknown): boolean | null {
  if (value === null || value === undefined) return null;
  if (value === true || value === 1 || value === "1") return true;
  if (value === false || value === 0 || value === "0") return false;
  return null;
}

function asIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const text = String(value);
  return text || null;
}

let ensured: Promise<void> | null = null;

export async function ensureOrgOcrSchema() {
  if (!ensured) {
    ensured = (async () => {
      const cols = await prisma.$queryRawUnsafe<ColumnInfo[]>("PRAGMA table_info(Organization)");
      const names = new Set(cols.map((col) => col.name));
      if (!names.has("ocrTemplateKey")) {
        await prisma.$executeRawUnsafe(
          "ALTER TABLE Organization ADD COLUMN ocrTemplateKey TEXT NOT NULL DEFAULT 'irrigation-service-order'",
        );
      }
      if (!names.has("ocrFieldNotes")) {
        await prisma.$executeRawUnsafe("ALTER TABLE Organization ADD COLUMN ocrFieldNotes TEXT");
      }
      if (!names.has("ocrEnabled")) {
        await prisma.$executeRawUnsafe("ALTER TABLE Organization ADD COLUMN ocrEnabled INTEGER");
      }
      if (!names.has("formsEnabled")) {
        await prisma.$executeRawUnsafe("ALTER TABLE Organization ADD COLUMN formsEnabled INTEGER");
      }
      if (!names.has("ocrBoxesConfirmedAt")) {
        await prisma.$executeRawUnsafe("ALTER TABLE Organization ADD COLUMN ocrBoxesConfirmedAt DATETIME");
      }
      if (!names.has("ocrFirstScanAt")) {
        await prisma.$executeRawUnsafe("ALTER TABLE Organization ADD COLUMN ocrFirstScanAt DATETIME");
      }
      if (!names.has("ocrFieldListReviewedAt")) {
        await prisma.$executeRawUnsafe("ALTER TABLE Organization ADD COLUMN ocrFieldListReviewedAt DATETIME");
      }
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS OrgOcrSample (
          id TEXT PRIMARY KEY,
          organizationId TEXT NOT NULL,
          fileName TEXT NOT NULL,
          mimeType TEXT NOT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (organizationId) REFERENCES Organization(id) ON DELETE CASCADE
        )
      `);
    })();
  }
  await ensured;
}

type OrgOcrRow = {
  plan: string | null;
  ocrTemplateKey: string | null;
  ocrFieldNotes: string | null;
  ocrEnabled: unknown;
  ocrBoxesConfirmedAt: unknown;
  ocrFirstScanAt: unknown;
  ocrFieldListReviewedAt: unknown;
};

function settingsFromRow(row: OrgOcrRow | undefined, samples: OrgOcrSample[]): OrgOcrSettings {
  const ocrOverride = asNullableBool(row?.ocrEnabled);
  return {
    templateKey: parseOcrTemplateKey(row?.ocrTemplateKey),
    fieldNotes: row?.ocrFieldNotes ?? "",
    samples,
    ocrOverride,
    ocrOn: resolveEntitlements({ plan: row?.plan, ocrEnabled: ocrOverride }).ocrEnabled,
    boxesConfirmedAt: asIso(row?.ocrBoxesConfirmedAt),
    firstScanAt: asIso(row?.ocrFirstScanAt),
    fieldListReviewedAt: asIso(row?.ocrFieldListReviewedAt),
  };
}

export function ocrSampleFilePath(sampleId: string) {
  const safeId = sampleId.replace(/[^a-zA-Z0-9_-]/g, "");
  return path.join(/*turbopackIgnore: true*/ uploadDir(), `ocr-sample-${safeId}`);
}

function mimeFor(file: File) {
  if (file.type && file.type !== "application/octet-stream") return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  if (name.endsWith(".heic") || name.endsWith(".heif")) return "image/heic";
  return "image/jpeg";
}

export function ticketSampleFilesFromForm(formData: FormData) {
  const named = formData
    .getAll("ticketSamples")
    .filter((item): item is File => item instanceof File && item.size > 0);
  const first = formData.get("ticketSample1");
  const second = formData.get("ticketSample2");
  const numbered = [first, second].filter((item): item is File => item instanceof File && item.size > 0);
  return [...named, ...numbered];
}

export function validateOcrSampleFiles(files: File[]) {
  for (const file of files) {
    if (file.size > MAX_OCR_SAMPLE_BYTES) {
      return { error: `${file.name} is over 8 MB.` };
    }
    const type = file.type.toLowerCase();
    const looksLikeImage = type.startsWith("image/") || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name);
    if (!looksLikeImage) {
      return { error: `${file.name} is not an image.` };
    }
  }
  return {};
}

export async function loadOrgOcrSettings(organizationId: string): Promise<OrgOcrSettings> {
  await ensureOrgOcrSchema();
  const rows = await prisma.$queryRaw<OrgOcrRow[]>`
    SELECT plan, ocrTemplateKey, ocrFieldNotes, ocrEnabled, ocrBoxesConfirmedAt, ocrFirstScanAt, ocrFieldListReviewedAt
    FROM Organization WHERE id = ${organizationId}
  `;
  const samples = await prisma.$queryRaw<OrgOcrSample[]>`
    SELECT id, fileName, mimeType FROM OrgOcrSample
    WHERE organizationId = ${organizationId}
    ORDER BY createdAt ASC
  `;
  return settingsFromRow(rows[0], samples);
}

export async function orgOcrIsOn(organizationId: string) {
  return (await loadOrgOcrSettings(organizationId)).ocrOn;
}

export async function loadOrgOcrOverrides() {
  await ensureOrgOcrSchema();
  const rows = await prisma.$queryRaw<Array<{ id: string; ocrEnabled: unknown; formsEnabled: unknown }>>`
    SELECT id, ocrEnabled, formsEnabled FROM Organization
  `;
  return new Map(
    rows.map((row) => [
      row.id,
      { ocrEnabled: asNullableBool(row.ocrEnabled), formsEnabled: asNullableBool(row.formsEnabled) },
    ]),
  );
}

export async function loadOrgPlanFlagOverrides(organizationId: string) {
  await ensureOrgOcrSchema();
  const rows = await prisma.$queryRaw<Array<{ ocrEnabled: unknown; formsEnabled: unknown }>>`
    SELECT ocrEnabled, formsEnabled FROM Organization WHERE id = ${organizationId}
  `;
  return {
    ocrEnabled: asNullableBool(rows[0]?.ocrEnabled),
    formsEnabled: asNullableBool(rows[0]?.formsEnabled),
  };
}

export async function orgFormsIsOn(organizationId: string) {
  const flags = await loadOrgPlanFlagOverrides(organizationId);
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { plan: true },
  });
  return resolveEntitlements({ plan: org?.plan, ...flags }).formsEnabled;
}

export async function setOrgFormsEnabled(organizationId: string, value: boolean | null) {
  await ensureOrgOcrSchema();
  await prisma.$executeRaw`
    UPDATE Organization SET formsEnabled = ${value} WHERE id = ${organizationId}
  `;
}

export async function setOrgOcrEnabled(organizationId: string, value: boolean | null) {
  await ensureOrgOcrSchema();
  await prisma.$executeRaw`
    UPDATE Organization SET ocrEnabled = ${value} WHERE id = ${organizationId}
  `;
}

export async function confirmOrgOcrBoxes(organizationId: string) {
  await ensureOrgOcrSchema();
  const at = new Date().toISOString();
  await prisma.$executeRaw`
    UPDATE Organization SET ocrBoxesConfirmedAt = ${at} WHERE id = ${organizationId}
  `;
}

export async function markOrgOcrFirstScan(organizationId: string) {
  await ensureOrgOcrSchema();
  await prisma.$executeRaw`
    UPDATE Organization SET ocrFirstScanAt = ${new Date().toISOString()}
    WHERE id = ${organizationId} AND ocrFirstScanAt IS NULL
  `;
}

export async function markOrgOcrFieldListReviewed(organizationId: string) {
  await ensureOrgOcrSchema();
  const at = new Date().toISOString();
  await prisma.$executeRaw`
    UPDATE Organization SET ocrFieldListReviewedAt = ${at} WHERE id = ${organizationId}
  `;
}

export async function saveOrgOcrTemplate(organizationId: string, templateKey: OcrTemplateKey, fieldNotes: string) {
  await ensureOrgOcrSchema();
  await prisma.$executeRaw`
    UPDATE Organization
    SET ocrTemplateKey = ${templateKey}, ocrFieldNotes = ${fieldNotes || null}
    WHERE id = ${organizationId}
  `;
}

export async function addOrgOcrSamples(organizationId: string, files: File[]) {
  await ensureOrgOcrSchema();
  const current = await loadOrgOcrSettings(organizationId);
  const room = MAX_OCR_SAMPLES - current.samples.length;
  if (room <= 0) return { error: `You can keep up to ${MAX_OCR_SAMPLES} sample photos.`, count: 0 };
  const toSave = files.slice(0, room);
  const invalid = validateOcrSampleFiles(toSave);
  if (invalid.error) return { error: invalid.error, count: 0 };

  await mkdir(/*turbopackIgnore: true*/ uploadDir(), { recursive: true });
  let count = 0;
  for (const file of toSave) {
    const id = `ocr_${crypto.randomUUID().replaceAll("-", "")}`;
    const createdAt = new Date().toISOString();
    await prisma.$executeRaw`
      INSERT INTO OrgOcrSample (id, organizationId, fileName, mimeType, createdAt)
      VALUES (${id}, ${organizationId}, ${file.name.slice(0, 180) || "ticket.jpg"}, ${mimeFor(file)}, ${createdAt})
    `;
    await writeFile(/*turbopackIgnore: true*/ ocrSampleFilePath(id), Buffer.from(await file.arrayBuffer()));
    count += 1;
  }
  return { count };
}

export async function removeOrgOcrSample(organizationId: string, sampleId: string) {
  await ensureOrgOcrSchema();
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM OrgOcrSample WHERE id = ${sampleId} AND organizationId = ${organizationId}
  `;
  if (!rows[0]) return { error: "Sample not found." };
  await prisma.$executeRaw`DELETE FROM OrgOcrSample WHERE id = ${sampleId}`;
  try {
    await unlink(/*turbopackIgnore: true*/ ocrSampleFilePath(sampleId));
  } catch {
    // already gone
  }
  return {};
}

export async function readOrgOcrSampleFile(sampleId: string) {
  return readFile(/*turbopackIgnore: true*/ ocrSampleFilePath(sampleId));
}

export async function loadOrgOcrScanContext(organizationId: string) {
  const settings = await loadOrgOcrSettings(organizationId);
  const sampleImages: { bytes: Buffer; mimeType: string }[] = [];
  for (const sample of settings.samples) {
    try {
      sampleImages.push({ bytes: await readOrgOcrSampleFile(sample.id), mimeType: sample.mimeType || "image/jpeg" });
    } catch {
      // skip missing files
    }
  }
  return {
    templateKey: settings.templateKey,
    fieldNotes: settings.fieldNotes,
    sampleImages,
  };
}

export async function applyOrgOcrFromSignup(organizationId: string, formData: FormData) {
  const templateKey = parseOcrTemplateKey(String(formData.get("ocrTemplateKey") ?? ""));
  const fieldNotes = String(formData.get("ocrFieldNotes") ?? "").trim().slice(0, 2000);
  await saveOrgOcrTemplate(organizationId, templateKey, fieldNotes);
  const files = ticketSampleFilesFromForm(formData);
  if (files.length) await addOrgOcrSamples(organizationId, files);
}
