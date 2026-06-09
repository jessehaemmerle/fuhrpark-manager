import { NextRequest, NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/auth-validators";
import { writeAuditLog } from "@/lib/audit";
import {
  buildPasswordResetUrl,
  generatePasswordToken,
  hashPasswordToken,
  passwordResetExpiry,
  shouldExposePasswordResetLink
} from "@/lib/password-tokens";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/rate-limit";

function requesterKey(request: NextRequest) {
  return request.headers.get("x-forwarded-for") ?? "local";
}

export async function POST(request: NextRequest) {
  try {
    assertRateLimit(`forgot-password:${requesterKey(request)}`, 6, 60_000);
    const parsed = forgotPasswordSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungueltige Eingabe." }, { status: 400 });
    }

    const genericResponse: { ok: true; message: string; resetLink?: string } = {
      ok: true,
      message: "Wenn ein aktives Konto existiert, wurde ein Reset-Link vorbereitet."
    };

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      include: { company: true }
    });

    if (!user || !user.active || (!user.company.active && user.role !== "PLATFORM_ADMIN")) {
      return NextResponse.json(genericResponse);
    }

    const token = generatePasswordToken();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: hashPasswordToken(token),
        passwordResetTokenExpiresAt: passwordResetExpiry(),
        passwordResetRequestedAt: new Date()
      }
    });

    await writeAuditLog({
      companyId: user.companyId,
      actorUserId: user.id,
      action: "auth.password_reset_requested",
      entityType: "User",
      entityId: user.id,
      metadata: { email: user.email }
    });

    if (shouldExposePasswordResetLink()) {
      genericResponse.resetLink = buildPasswordResetUrl(token);
    }

    return NextResponse.json(genericResponse);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Reset-Link konnte nicht vorbereitet werden." }, { status: 400 });
  }
}
