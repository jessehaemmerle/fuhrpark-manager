import "server-only";

import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { storageProvider } from "@/lib/upload";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf"
};

export type SavedFile = { url: string; mimeType: string; size: number };

export async function saveUploadedFile(
  file: File,
  options?: { allowed?: readonly string[] }
): Promise<SavedFile> {
  const allowed = options?.allowed ?? storageProvider.acceptedMimeTypes;

  if (file.size === 0) {
    throw new Error("Die Datei ist leer.");
  }
  if (file.size > storageProvider.maxFileSizeMb * 1024 * 1024) {
    throw new Error(`Die Datei überschreitet das Limit von ${storageProvider.maxFileSizeMb} MB.`);
  }
  if (!allowed.includes(file.type)) {
    throw new Error("Dieses Dateiformat wird nicht unterstützt.");
  }

  const extension = EXTENSION_BY_MIME[file.type] ?? "bin";
  const fileName = `${Date.now()}-${randomBytes(8).toString("hex")}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, fileName), buffer);

  return { url: `/uploads/${fileName}`, mimeType: file.type, size: file.size };
}
