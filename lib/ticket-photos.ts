import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "./prisma";

export const MAX_TICKET_PHOTOS = 6;
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"]);

export function uploadDir() {
  if (process.env.UPLOAD_DIR) return process.env.UPLOAD_DIR;
  if (process.env.DATABASE_URL?.includes("/data/")) return "/data/uploads";
  return path.join(process.cwd(), "uploads");
}

export function photoFilePath(photoId: string) {
  const safeId = photoId.replace(/[^a-zA-Z0-9_-]/g, "");
  return path.join(/*turbopackIgnore: true*/ uploadDir(), safeId);
}

export function photoFilesFromForm(formData: FormData) {
  return formData.getAll("photos").filter((item): item is File => item instanceof File && item.size > 0);
}

export function validatePhotoFiles(files: File[]) {
  if (files.length > MAX_TICKET_PHOTOS) {
    return { error: `You can attach up to ${MAX_TICKET_PHOTOS} photos at a time.` };
  }
  for (const file of files) {
    if (file.size > MAX_PHOTO_BYTES) {
      return { error: `${file.name} is over 8 MB.` };
    }
    const type = file.type.toLowerCase();
    const looksLikeImage = type.startsWith("image/") || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name);
    if (!looksLikeImage) {
      return { error: `${file.name} is not an image.` };
    }
    if (type && type !== "application/octet-stream" && !ALLOWED_TYPES.has(type) && !type.startsWith("image/")) {
      return { error: `${file.name} is not a supported photo type.` };
    }
  }
  return {};
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

export async function saveTicketPhotos(input: {
  files: File[];
  ticketId: string;
  updateId?: string | null;
  userId: string;
}): Promise<{ error?: string; count: number }> {
  if (input.files.length === 0) return { count: 0 };
  const invalid = validatePhotoFiles(input.files);
  if (invalid.error) return { error: invalid.error, count: 0 };

  await mkdir(/*turbopackIgnore: true*/ uploadDir(), { recursive: true });
  let count = 0;
  for (const file of input.files) {
    const photo = await prisma.ticketPhoto.create({
      data: {
        ticketId: input.ticketId,
        updateId: input.updateId ?? null,
        userId: input.userId,
        fileName: file.name.slice(0, 180) || "photo.jpg",
        mimeType: mimeFor(file),
      },
    });
    await writeFile(/*turbopackIgnore: true*/ photoFilePath(photo.id), Buffer.from(await file.arrayBuffer()));
    count += 1;
  }
  return { count };
}

export async function readTicketPhotoFile(photoId: string) {
  return readFile(/*turbopackIgnore: true*/ photoFilePath(photoId));
}
