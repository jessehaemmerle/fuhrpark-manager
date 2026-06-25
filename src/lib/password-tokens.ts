import "server-only";

import { createHash, randomBytes } from "crypto";
import { addDays, addMinutes } from "date-fns";

export const PASSWORD_RESET_MINUTES = 45;
export const INVITATION_VALID_DAYS = 7;

export function generatePasswordToken() {
  return randomBytes(32).toString("base64url");
}

export function hashPasswordToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function passwordResetExpiry() {
  return addMinutes(new Date(), PASSWORD_RESET_MINUTES);
}

export function buildPasswordResetUrl(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = new URL("/reset-password", baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

export function shouldExposePasswordResetLink() {
  return process.env.NODE_ENV !== "production" || process.env.PASSWORD_RESET_EXPOSE_LINK === "true";
}

export function invitationExpiry() {
  return addDays(new Date(), INVITATION_VALID_DAYS);
}

export function buildInvitationUrl(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = new URL(`/invite/${token}`, baseUrl);
  return url.toString();
}
