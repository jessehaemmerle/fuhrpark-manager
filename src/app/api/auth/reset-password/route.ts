import { NextRequest, NextResponse } from "next/server";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { resetPasswordSchema } from "@/lib/auth-validators";
import { writeAuditLog } from "@/lib/audit";
import { hashPasswordToken } from "@/lib/password-tokens";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/rate-limit";

function requesterKey(request: NextRequest) {
  return request.headers.get("x-forwarded-for") ?? "local";
}

export async function POST(request: NextRequest) {
  try {
    assertRateLimit(`reset-password:${requesterKey(request)}`, 8, 60_000);
    const parsed = resetPasswordSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungueltige Eingabe." }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        passwordResetTokenHash: hashPasswordToken(parsed.data.token),
        passwordResetTokenExpiresAt: { gt: new Date() }
      },
      include: { company: true }
    });

    if (!user) {
      return NextResponse.json({ error: "Der Reset-Link ist ungueltig oder abgelaufen." }, { status: 400 });
    }

    if (!user.active || (!user.company.active && user.role !== "PLATFORM_ADMIN")) {
      return NextResponse.json({ error: "Dieses Konto ist nicht aktiv." }, { status: 403 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(parsed.data.password),
        mustChangePassword: false,
        passwordChangedAt: new Date(),
        temporaryPasswordIssuedAt: null,
        passwordResetTokenHash: null,
        passwordResetTokenExpiresAt: null,
        passwordResetRequestedAt: null
      }
    });

    await writeAuditLog({
      companyId: user.companyId,
      actorUserId: user.id,
      action: "auth.password_reset_completed",
      entityType: "User",
      entityId: user.id,
      metadata: { email: user.email }
    });

    await setSessionCookie(user);
    return NextResponse.json({ ok: true, redirectTo: user.role === "PLATFORM_ADMIN" ? "/admin" : "/dashboard" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Passwort konnte nicht zurueckgesetzt werden." }, { status: 400 });
  }
}
