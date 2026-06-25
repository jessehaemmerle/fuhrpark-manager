"use server";

import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { LicenseCheckResult } from "@prisma/client";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { requireAuth, requireFleetAdmin } from "@/lib/auth";
import { assertFeatureAccess, getPlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { toFormDataObject } from "@/lib/utils";
import { idSchema } from "@/lib/validators";

const optionalShortText = z
  .preprocess((value) => (value === "" || value === null ? undefined : value), z.string().trim().max(255).optional())
  .transform((value) => value?.replace(/[<>]/g, ""));

const optionalText = z
  .preprocess((value) => (value === "" || value === null ? undefined : value), z.string().trim().max(1500).optional())
  .transform((value) => value?.replace(/[<>]/g, ""));

const licenseCheckSchema = z.object({
  userId: idSchema,
  result: z.nativeEnum(LicenseCheckResult),
  method: optionalShortText,
  notes: optionalText
});

export async function recordLicenseCheck(formData: FormData) {
  const user = await requireAuth();
  requireFleetAdmin(user);
  const company = await prisma.company.findUniqueOrThrow({ where: { id: user.companyId } });
  assertFeatureAccess(getPlan(company), "complianceAccess");

  const data = licenseCheckSchema.parse(toFormDataObject(formData));
  const target = await prisma.user.findFirstOrThrow({
    where: { id: data.userId, companyId: user.companyId }
  });

  const now = new Date();
  const nextCheckDue = addDays(now, company.licenseCheckIntervalDays);

  const check = await prisma.licenseCheck.create({
    data: {
      companyId: user.companyId,
      userId: target.id,
      checkedById: user.id,
      method: data.method,
      result: data.result,
      checkedAt: now,
      nextCheckDue,
      notes: data.notes
    }
  });

  await prisma.user.update({
    where: { id: target.id },
    data: {
      lastLicenseCheckDate: now,
      nextLicenseCheckDue: nextCheckDue
    }
  });

  await writeAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: "license_check.recorded",
    entityType: "LicenseCheck",
    entityId: check.id,
    metadata: { result: data.result }
  });
  revalidatePath("/compliance");
  revalidatePath("/users");
}
