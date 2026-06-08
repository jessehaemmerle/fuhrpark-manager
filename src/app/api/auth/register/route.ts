import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/rate-limit";
import { getTrialEndDate, hashPassword, setSessionCookie } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { registerSchema } from "@/lib/auth-validators";

function requesterKey(request: NextRequest) {
  return request.headers.get("x-forwarded-for") ?? "local";
}

async function uniqueCompanySlug(companyName: string) {
  const base = slugify(companyName) || "firma";
  let slug = base;
  let suffix = 2;

  while (await prisma.company.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

export async function POST(request: NextRequest) {
  try {
    assertRateLimit(`register:${requesterKey(request)}`, 6, 60_000);
    const parsed = registerSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungueltige Eingabe." }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true }
    });

    if (existingUser) {
      return NextResponse.json({ error: "Diese E-Mail ist bereits registriert." }, { status: 409 });
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const slug = await uniqueCompanySlug(parsed.data.companyName);
    const trialStartDate = new Date();
    const trialEndDate = getTrialEndDate();

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: parsed.data.companyName,
          slug,
          contactEmail: parsed.data.email,
          contactPhone: parsed.data.contactPhone,
          country: parsed.data.country,
          trialStartDate,
          trialEndDate,
          subscriptionTier: "TRIAL"
        }
      });

      const user = await tx.user.create({
        data: {
          companyId: company.id,
          name: parsed.data.name,
          email: parsed.data.email,
          passwordHash,
          role: "OWNER",
          driverApproved: true,
          lastLicenseCheckDate: new Date()
        },
        select: { id: true, companyId: true, role: true, name: true, email: true }
      });

      await tx.auditLog.create({
        data: {
          companyId: company.id,
          actorUserId: user.id,
          action: "company.created",
          entityType: "Company",
          entityId: company.id,
          metadata: { source: "registration", tier: "TRIAL" }
        }
      });

      return { company, user };
    });

    await setSessionCookie(result.user);
    return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Registrierung fehlgeschlagen." }, { status: 400 });
  }
}
