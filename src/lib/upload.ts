const MAX_PHOTO_URLS = 8;

export function normalizePhotoUrls(raw: string | string[] | undefined | null) {
  const values = Array.isArray(raw) ? raw : raw?.split(/\r?\n|,/g) ?? [];
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, MAX_PHOTO_URLS);
}

export function validatePhotoUrls(urls: string[]) {
  for (const url of urls) {
    if (!/^https?:\/\//.test(url) && !url.startsWith("/uploads/")) {
      throw new Error("Fotos muessen als HTTPS-URL oder lokaler Upload-Pfad referenziert werden.");
    }
  }
  return urls;
}

export const storageProvider = {
  driver: process.env.UPLOAD_STORAGE_DRIVER ?? "local",
  maxPhotoUrls: MAX_PHOTO_URLS,
  acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  maxFileSizeMb: 8
};
