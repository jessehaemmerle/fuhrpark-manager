import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { setPasswordSchema } from "@/lib/auth-validators";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/rate-limit";

function requesterKey(request: NextRequest) {
  return request.headers.get("x-forwarded-for") ?? "local";
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Bitte zuerst einloggen." }, { status: 401 });
    }
    if (!user.mustChangePassword) {
      return NextResponse.json({ error: "Fuer dieses Konto ist kein Passwortwechsel offen." }, { status: 403 });
    }

    assertRateLimit(`set-password:${user.id}:${requesterKey(request)}`, 8, 60_000);
    const parsed = setPasswordSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungueltige Eingabe." }, { status: 400 });
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
      action: "auth.password_changed",
      entityType: "User",
      entityId: user.id,
      metadata: { source: user.mustChangePassword ? "forced_change" : "self_service" }
    });

    return NextResponse.json({ ok: true, redirectTo: user.role === "PLATFORM_ADMIN" ? "/admin" : "/dashboard" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Passwort konnte nicht gesetzt werden." }, { status: 400 });
  }
}
