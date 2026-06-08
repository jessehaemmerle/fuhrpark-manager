import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function assertStrongPassword(password) {
  const checks = [
    [password.length >= 16, "mindestens 16 Zeichen"],
    [/[a-z]/.test(password), "einen Kleinbuchstaben"],
    [/[A-Z]/.test(password), "einen Grossbuchstaben"],
    [/[0-9]/.test(password), "eine Zahl"],
    [/[^A-Za-z0-9]/.test(password), "ein Sonderzeichen"]
  ];
  const missing = checks.filter(([ok]) => !ok).map(([, label]) => label);

  if (missing.length > 0) {
    throw new Error(`SUPER_ADMIN_PASSWORD ist nicht sicher genug. Es fehlt: ${missing.join(", ")}.`);
  }
}

function futureDate(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function main() {
  const email = (process.env.SUPER_ADMIN_EMAIL ?? "jesse@haemmerle.at").trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!password) {
    console.warn("SUPER_ADMIN_PASSWORD ist nicht gesetzt. Super-Admin-Bootstrap wird uebersprungen.");
    return;
  }

  assertStrongPassword(password);

  const name = process.env.SUPER_ADMIN_NAME?.trim() || "Jesse Haemmerle";
  const passwordHash = await bcrypt.hash(password, 12);

  const company = await prisma.company.upsert({
    where: { slug: "fleetbase-operations" },
    update: {
      active: true,
      contactEmail: email,
      country: "AT",
      subscriptionTier: "ENTERPRISE",
      trialEndDate: futureDate(3650)
    },
    create: {
      name: "Fleetbase Operations",
      slug: "fleetbase-operations",
      contactEmail: email,
      subscriptionTier: "ENTERPRISE",
      trialEndDate: futureDate(3650),
      primaryBrandColor: "#0f766e",
      country: "AT",
      active: true
    }
  });

  await prisma.user.upsert({
    where: { email },
    update: {
      companyId: company.id,
      name,
      passwordHash,
      role: "PLATFORM_ADMIN",
      active: true,
      driverApproved: true,
      driverBlocked: false
    },
    create: {
      companyId: company.id,
      name,
      email,
      passwordHash,
      role: "PLATFORM_ADMIN",
      active: true,
      driverApproved: true,
      driverBlocked: false
    }
  });

  console.log(`Super-Admin ${email} ist aktiv.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
