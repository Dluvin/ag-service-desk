import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { uploadDir } from "./ticket-photos";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 2 * 1024 * 1024;

export function logoFilePath(organizationId: string) {
  const safeId = organizationId.replace(/[^a-zA-Z0-9_-]/g, "");
  return path.join(/*turbopackIgnore: true*/ uploadDir(), `logo-${safeId}`);
}

function mimeFor(file: File) {
  if (file.type && ALLOWED.has(file.type)) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

export function validateLogoFile(file: File) {
  if (file.size > MAX_BYTES) return { error: "Logo must be 2 MB or smaller." };
  const type = file.type.toLowerCase();
  const namedOk = /\.(jpe?g|png|webp|gif)$/i.test(file.name);
  if (!ALLOWED.has(type) && !namedOk) {
    return { error: "Use a PNG, JPG, WebP, or GIF logo." };
  }
  return { mimeType: mimeFor(file) };
}

export async function saveCompanyLogoFile(organizationId: string, file: File) {
  const check = validateLogoFile(file);
  if (check.error || !check.mimeType) return { error: check.error ?? "Invalid logo." };
  await mkdir(/*turbopackIgnore: true*/ uploadDir(), { recursive: true });
  await writeFile(/*turbopackIgnore: true*/ logoFilePath(organizationId), Buffer.from(await file.arrayBuffer()));
  return { mimeType: check.mimeType, fileName: file.name.slice(0, 180) || "logo.png" };
}

export async function readCompanyLogoFile(organizationId: string) {
  return readFile(/*turbopackIgnore: true*/ logoFilePath(organizationId));
}

export async function removeCompanyLogoFile(organizationId: string) {
  try {
    await unlink(/*turbopackIgnore: true*/ logoFilePath(organizationId));
  } catch {
    // already gone
  }
}
