import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function sanitizeText(value: string) {
  return value.replace(/[<>]/g, "").trim();
}

export function parseOptionalInt(value: FormDataEntryValue | null) {
  if (value === null || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

export function parseDateInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Ungueltiges Datum");
  }
  return date;
}

// Sentinel-Datum fuer unbegrenzt gueltige Lizenzen. Die Lizenz selbst speichert
// dafuer NULL in validUntil; abgeleitete Pflichtfelder (z. B. Company.trialEndDate)
// erhalten dieses weit in der Zukunft liegende Datum, damit nichts ablaeuft.
export const UNLIMITED_LICENSE_DATE = new Date(Date.UTC(9999, 11, 31));

// Erkennt sowohl ein fehlendes Datum (Lizenz: validUntil = NULL) als auch das
// Sentinel-Datum als "unbegrenzt".
export function isUnlimitedDate(date: Date | string | null | undefined): boolean {
  if (date === null || date === undefined) return true;
  return new Date(date).getUTCFullYear() >= 9000;
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "-";
  return format(new Date(date), "dd.MM.yyyy", { locale: de });
}

// Wie formatDate, zeigt aber "Unbegrenzt" fuer unbefristete Lizenzen/Zeitraeume.
export function formatValidUntil(date: Date | string | null | undefined) {
  if (isUnlimitedDate(date)) return "Unbegrenzt";
  return formatDate(date);
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return "-";
  return format(new Date(date), "dd.MM.yyyy HH:mm", { locale: de });
}

export function formatCurrency(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0);
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR"
  }).format(numeric);
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function toFormDataObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export function monthRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}
