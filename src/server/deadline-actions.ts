"use server";

import { revalidatePath } from "next/cache";
import { addDays } from "date-fns";
import { DeadlineType } from "@prisma/client";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { requireAuth, requireFleetAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toFormDataObject } from "@/lib/utils";
import { idSchema } from "@/lib/validators";

const optionalText = z
  .preprocess((value) => (value === "" || value === null ? undefined : value), z.string().trim().max(1500).optional())
  .transform((value) => value?.replace(/[<>]/g, ""));

const optionalShortText = z
  .preprocess((value) => (value === "" || value === null ? undefined : value), z.string().trim().max(255).optional())
  .transform((value) => value?.replace(/[<>]/g, ""));

const optionalInt = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().int().min(0).optional()
);

const deadlineSchema = z.object({
  vehicleId: idSchema,
  type: z.nativeEnum(DeadlineType),
  title: optionalShortText,
  dueDate: z.coerce.date(),
  dueMileage: optionalInt,
  intervalDays: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().int().min(1).optional()
  ),
  intervalMileage: optionalInt,
  reminderLeadDays: z.coerce.number().int().min(0).max(365).default(30),
  notes: optionalText
});

const deadlineIdSchema = z.object({
  deadlineId: idSchema
});

async function getScopedVehicle(vehicleId: string, companyId: string) {
  return prisma.vehicle.findFirstOrThrow({
    where: { id: vehicleId, companyId }
  });
}

export async function createDeadline(formData: FormData) {
  const user = await requireAuth();
  requireFleetAdmin(user);
  const data = deadlineSchema.parse(toFormDataObject(formData));
  const vehicle = await getScopedVehicle(data.vehicleId, user.companyId);

  const deadline = await prisma.vehicleDeadline.create({
    data: {
      companyId: user.companyId,
      vehicleId: vehicle.id,
      type: data.type,
      title: data.title,
      dueDate: data.dueDate,
      dueMileage: data.dueMileage,
      intervalDays: data.intervalDays,
      intervalMileage: data.intervalMileage,
      reminderLeadDays: data.reminderLeadDays,
      notes: data.notes,
      createdById: user.id
    }
  });

  await writeAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: "deadline.created",
    entityType: "VehicleDeadline",
    entityId: deadline.id,
    metadata: { vehicleId: vehicle.id, type: deadline.type, dueDate: deadline.dueDate.toISOString() }
  });
  revalidatePath("/deadlines");
  revalidatePath("/dashboard");
}

export async function completeDeadline(formData: FormData) {
  const user = await requireAuth();
  requireFleetAdmin(user);
  const data = deadlineIdSchema.parse(toFormDataObject(formData));
  const deadline = await prisma.vehicleDeadline.findFirstOrThrow({
    where: { id: data.deadlineId, companyId: user.companyId }
  });

  await prisma.vehicleDeadline.update({
    where: { id: deadline.id },
    data: { completed: true, completedAt: new Date() }
  });

  let followUpId: string | null = null;
  if (deadline.intervalDays && deadline.intervalDays > 0) {
    const followUp = await prisma.vehicleDeadline.create({
      data: {
        companyId: user.companyId,
        vehicleId: deadline.vehicleId,
        type: deadline.type,
        title: deadline.title,
        dueDate: addDays(deadline.dueDate, deadline.intervalDays),
        intervalDays: deadline.intervalDays,
        intervalMileage: deadline.intervalMileage,
        reminderLeadDays: deadline.reminderLeadDays,
        notes: deadline.notes,
        createdById: user.id
      }
    });
    followUpId = followUp.id;
  }

  await writeAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: "deadline.completed",
    entityType: "VehicleDeadline",
    entityId: deadline.id,
    metadata: { vehicleId: deadline.vehicleId, type: deadline.type, followUpId }
  });
  revalidatePath("/deadlines");
  revalidatePath("/dashboard");
}

export async function deleteDeadline(formData: FormData) {
  const user = await requireAuth();
  requireFleetAdmin(user);
  const data = deadlineIdSchema.parse(toFormDataObject(formData));
  const deadline = await prisma.vehicleDeadline.findFirstOrThrow({
    where: { id: data.deadlineId, companyId: user.companyId }
  });

  await prisma.vehicleDeadline.delete({ where: { id: deadline.id } });

  await writeAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: "deadline.deleted",
    entityType: "VehicleDeadline",
    entityId: deadline.id,
    metadata: { vehicleId: deadline.vehicleId, type: deadline.type }
  });
  revalidatePath("/deadlines");
  revalidatePath("/dashboard");
}
