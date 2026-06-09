import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/rate-limit";
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

    if (!user.active || !user.company.active) {
      return NextResponse.json({ error: "Dieses Konto ist nicht aktiv." }, { status: 403 });
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
