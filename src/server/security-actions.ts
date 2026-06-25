"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { writeAuditLog } from "@/lib/audit";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateRecoveryCodes, generateTotpSecret, hashRecoveryCode, verifyTotp } from "@/lib/totp";
import { toFormDataObject } from "@/lib/utils";
import { notificationPreferenceSchema, twoFactorConfirmSchema } from "@/lib/validators";

const RECOVERY_COOKIE = "fb_recovery_codes";

function stashRecoveryCodes(codes: string[]) {
  cookies().set(RECOVERY_COOKIE, codes.join(","), {
    httpOnly: false,
    sameSite: "lax",
    path: "/settings",
    maxAge: 600
  });
}

export async function updateNotificationPreferences(formData: FormData) {
  const user = await requireAuth();
  const data = notificationPreferenceSchema.parse(toFormDataObject(formData));
  await prisma.user.update({ where: { id: user.id }, data: { notifyByEmail: data.notifyByEmail } });
  revalidatePath("/settings");
}

export async function initTwoFactor() {
  const user = await requireAuth();
  const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { twoFactorEnabled: true } });
  if (record.twoFactorEnabled) throw new Error("Zwei-Faktor-Authentifizierung ist bereits aktiv.");
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorSecret: generateTotpSecret() } });
  revalidatePath("/settings");
}

export async function confirmTwoFactor(formData: FormData) {
  const user = await requireAuth();
  const data = twoFactorConfirmSchema.parse(toFormDataObject(formData));
  const record = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { twoFactorSecret: true, twoFactorEnabled: true }
  });
  if (record.twoFactorEnabled) throw new Error("Zwei-Faktor-Authentifizierung ist bereits aktiv.");
  if (!record.twoFactorSecret || !verifyTotp(record.twoFactorSecret, data.code)) {
    throw new Error("Der Code ist ungültig. Bitte erneut versuchen.");
  }

  const recoveryCodes = generateRecoveryCodes();
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: true, twoFactorRecoveryCodes: recoveryCodes.map(hashRecoveryCode) }
  });
  await writeAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: "auth.2fa_enabled",
    entityType: "User",
    entityId: user.id
  });
  stashRecoveryCodes(recoveryCodes);
  revalidatePath("/settings");
  redirect("/settings?twoFactor=enabled#security");
}

export async function disableTwoFactor(formData: FormData) {
  const user = await requireAuth();
  const parsed = twoFactorConfirmSchema.safeParse(toFormDataObject(formData));
  const record = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { twoFactorSecret: true, twoFactorEnabled: true }
  });
  if (!record.twoFactorEnabled) throw new Error("Zwei-Faktor-Authentifizierung ist nicht aktiv.");

  const code = parsed.success ? parsed.data.code : "";
  if (!record.twoFactorSecret || !verifyTotp(record.twoFactorSecret, code)) {
    throw new Error("Bitte einen gültigen Authenticator-Code eingeben, um 2FA zu deaktivieren.");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorRecoveryCodes: [] }
  });
  await writeAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: "auth.2fa_disabled",
    entityType: "User",
    entityId: user.id
  });
  revalidatePath("/settings");
}

export async function regenerateRecoveryCodes() {
  const user = await requireAuth();
  const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { twoFactorEnabled: true } });
  if (!record.twoFactorEnabled) throw new Error("Zwei-Faktor-Authentifizierung ist nicht aktiv.");

  const recoveryCodes = generateRecoveryCodes();
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorRecoveryCodes: recoveryCodes.map(hashRecoveryCode) }
  });
  await writeAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: "auth.2fa_recovery_regenerated",
    entityType: "User",
    entityId: user.id
  });
  stashRecoveryCodes(recoveryCodes);
  revalidatePath("/settings");
  redirect("/settings?recoveryRegenerated=1#security");
}
