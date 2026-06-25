import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/rate-limit";
import { hashRecoveryCode, verifyTotp } from "@/lib/totp";
import { loginSchema } from "@/lib/auth-validators";

function requesterKey(request: NextRequest) {
  return request.headers.get("x-forwarded-for") ?? "local";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungueltige Eingabe." }, { status: 400 });
    }

    assertRateLimit(`login:${parsed.data.email}:${requesterKey(request)}`, 8, 60_000);

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      include: { company: true }
    });

    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return NextResponse.json({ error: "E-Mail oder Passwort ist falsch." }, { status: 401 });
    }

    if (!user.active || (!user.company.active && user.role !== "PLATFORM_ADMIN")) {
      return NextResponse.json({ error: "Dieses Konto ist nicht aktiv." }, { status: 403 });
    }

    if (user.twoFactorEnabled) {
      const code = typeof body.code === "string" ? body.code.trim() : "";
      if (!code) {
        return NextResponse.json({ twoFactorRequired: true });
      }

      const okTotp = user.twoFactorSecret ? verifyTotp(user.twoFactorSecret, code) : false;
      let okRecovery = false;
      if (!okTotp && user.twoFactorRecoveryCodes.length > 0) {
        const hashed = hashRecoveryCode(code);
        if (user.twoFactorRecoveryCodes.includes(hashed)) {
          okRecovery = true;
          await prisma.user.update({
            where: { id: user.id },
            data: { twoFactorRecoveryCodes: user.twoFactorRecoveryCodes.filter((stored) => stored !== hashed) }
          });
        }
      }

      if (!okTotp && !okRecovery) {
        return NextResponse.json({ error: "Der Authenticator-Code ist ungültig.", twoFactorRequired: true }, { status: 401 });
      }
    }

    await setSessionCookie(user);
    return NextResponse.json({
      ok: true,
      redirectTo: user.mustChangePassword ? "/set-password" : user.role === "PLATFORM_ADMIN" ? "/admin" : "/dashboard",
      mustChangePassword: user.mustChangePassword
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Login fehlgeschlagen." }, { status: 400 });
  }
}
