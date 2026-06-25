"use server";

import { revalidatePath } from "next/cache";
import { CostCategory } from "@prisma/client";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { requireAuth, requireFleetAdmin } from "@/lib/auth";
import { assertFeatureAccess, getPlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { idSchema } from "@/lib/validators";
import { toFormDataObject } from "@/lib/utils";

const optionalShortText = z
  .preprocess((value) => (value === "" || value === null ? undefined : value), z.string().trim().max(255).optional())
  .transform((value) => value?.replace(/[<>]/g, ""));

const optionalText = z
  .preprocess((value) => (value === "" || value === null ? undefined : value), z.string().trim().max(1500).optional())
  .transform((value) => value?.replace(/[<>]/g, ""));

const optionalNumber = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().min(0).optional()
);

const optionalInt = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().int().min(0).optional()
);

const costEntrySchema = z.object({
  vehicleId: idSchema,
  category: z.nativeEnum(CostCategory),
  amount: z.coerce.number().min(0),
  incurredAt: z.coerce.date(),
  vendor: optionalShortText,
  note: optionalText,
  liters: optionalNumber,
  energyKwh: optionalNumber,
  mileage: optionalInt,
  pricePerUnit: optionalNumber
});

const costEntryIdSchema = z.object({
  costEntryId: idSchema
});

export async function createCostEntry(formData: FormData) {
  const user = await requireAuth();
  requireFleetAdmin(user);
  const company = await prisma.company.findUniqueOrThrow({ where: { id: user.companyId } });
  assertFeatureAccess(getPlan(company), "costTrackingAccess");
  const data = costEntrySchema.parse(toFormDataObject(formData));
  const vehicle = await prisma.vehicle.findFirstOrThrow({
    where: { id: data.vehicleId, companyId: user.companyId }
  });

  const entry = await prisma.costEntry.create({
    data: {
      companyId: user.companyId,
      vehicleId: vehicle.id,
      category: data.category,
      amount: data.amount,
      incurredAt: data.incurredAt,
      vendor: data.vendor,
      note: data.note,
      liters: data.liters,
      energyKwh: data.energyKwh,
      mileage: data.mileage,
      pricePerUnit: data.pricePerUnit,
      createdById: user.id
    }
  });

  await writeAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: "cost.created",
    entityType: "CostEntry",
    entityId: entry.id,
    metadata: { vehicleId: vehicle.id, category: entry.category, amount: String(entry.amount) }
  });
  revalidatePath("/costs");
  revalidatePath("/dashboard");
}

export async function deleteCostEntry(formData: FormData) {
  const user = await requireAuth();
  requireFleetAdmin(user);
  const data = costEntryIdSchema.parse(toFormDataObject(formData));
  const entry = await prisma.costEntry.findFirstOrThrow({
    where: { id: data.costEntryId, companyId: user.companyId }
  });

  await prisma.costEntry.delete({ where: { id: entry.id } });

  await writeAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: "cost.deleted",
    entityType: "CostEntry",
    entityId: entry.id,
    metadata: { vehicleId: entry.vehicleId, category: entry.category }
  });
  revalidatePath("/costs");
  revalidatePath("/dashboard");
}
