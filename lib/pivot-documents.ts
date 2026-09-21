import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "./prisma";
import { uploadDir } from "./ticket-photos";

export const MAX_PIVOT_DOCUMENTS = 10;
export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

const EXT_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

export function documentFilePath(documentId: string) {
  const safeId = documentId.replace(/[^a-zA-Z0-9_-]/g, "");
  return path.join(/*turbopackIgnore: true*/ uploadDir(), `pdoc-${safeId}`);
}

export function documentFilesFromForm(formData: FormData) {
  return formData.getAll("documents").filter((item): item is File => item instanceof File && item.size > 0);
}

function extensionOf(fileName: string) {
  const match = fileName.toLowerCase().match(/\.[a-z0-9]+$/);
  return match?.[0] ?? "";
}

function mimeFor(file: File) {
  if (file.type && file.type !== "application/octet-stream" && ALLOWED_TYPES.has(file.type)) {
    return file.type;
  }
  return EXT_MIME[extensionOf(file.name)] ?? "";
}

export function validateDocumentFiles(files: File[]) {
  if (files.length > MAX_PIVOT_DOCUMENTS) {
    return { error: `You can attach up to ${MAX_PIVOT_DOCUMENTS} files at a time.` };
  }
  for (const file of files) {
    if (file.size > MAX_DOCUMENT_BYTES) {
      return { error: `${file.name} is over 8 MB.` };
    }
    if (!mimeFor(file)) {
      return { error: `${file.name} is not a supported document type.` };
    }
  }
  return {};
}

export async function savePivotDocuments(input: {
  files: File[];
  pivotId: string;
  userId: string;
}): Promise<{ error?: string; count: number }> {
  if (input.files.length === 0) return { count: 0 };
  const invalid = validateDocumentFiles(input.files);
  if (invalid.error) return { error: invalid.error, count: 0 };

  await mkdir(/*turbopackIgnore: true*/ uploadDir(), { recursive: true });
  let count = 0;
  for (const file of input.files) {
    const mimeType = mimeFor(file);
    const document = await prisma.pivotDocument.create({
      data: {
        pivotId: input.pivotId,
        userId: input.userId,
        fileName: file.name.slice(0, 180) || "document",
        mimeType,
      },
    });
    try {
      await writeFile(/*turbopackIgnore: true*/ documentFilePath(document.id), Buffer.from(await file.arrayBuffer()));
      count += 1;
    } catch (error) {
      await prisma.pivotDocument.delete({ where: { id: document.id } });
      throw error;
    }
  }
  return { count };
}

export async function readPivotDocumentFile(documentId: string) {
  return readFile(/*turbopackIgnore: true*/ documentFilePath(documentId));
}

export async function removePivotDocumentFile(documentId: string) {
  try {
    await unlink(/*turbopackIgnore: true*/ documentFilePath(documentId));
  } catch {
    // already gone
  }
}

export function safePivotReturnTo(value: string, fallback: string) {
  if (value.startsWith("/farmers/") || value.startsWith("/pivots/")) return value;
  return fallback;
}

export function downloadDisposition(mimeType: string) {
  if (mimeType.startsWith("image/") || mimeType === "application/pdf" || mimeType.startsWith("text/")) {
    return "inline";
  }
  return "attachment";
}

export function safeDownloadName(fileName: string) {
  return fileName.replaceAll('"', "").replaceAll(/[/\\]/g, "") || "document";
}
