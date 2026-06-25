"use server";

import { revalidatePath } from "next/cache";
import { DocumentType } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { requireAuth, requireFleetAdmin } from "@/lib/auth";
import { assertFeatureAccess, getPlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { validateDocumentUrl } from "@/lib/upload";
import { toFormDataObject } from "@/lib/utils";
import { z } from "zod";
import { idSchema } from "@/lib/validators";

const documentSchema = z.object({
  vehicleId: idSchema,
  type: z.nativeEnum(DocumentType),
  title: z
    .string({ required_error: "Titel ist erforderlich." })
    .trim()
    .min(2, "Titel ist erforderlich.")
    .max(255, "Titel ist zu lang.")
    .transform((value) => value.replace(/[<>]/g, "")),
  fileUrl: z.string({ required_error: "Bitte eine Datei hochladen." }),
  validUntil: z.preprocess((value) => (value === "" || value === null ? undefined : value), z.coerce.date().optional()),
  notes: z
    .preprocess((value) => (value === "" || value === null ? undefined : value), z.string().trim().max(1500).optional())
    .transform((value) => value?.replace(/[<>]/g, ""))
});

const documentIdSchema = z.object({
  documentId: idSchema
});

export async function createDocument(formData: FormData) {
  const user = await requireAuth();
  requireFleetAdmin(user);
  const company = await prisma.company.findUniqueOrThrow({ where: { id: user.companyId } });
  assertFeatureAccess(getPlan(company), "documentManagementAccess");

  const data = documentSchema.parse(toFormDataObject(formData));

  const url = data.fileUrl
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .find(Boolean);

  if (!url) {
    throw new Error("Bitte eine Datei hochladen.");
  }
  validateDocumentUrl(url);

  const vehicle = await prisma.vehicle.findFirstOrThrow({
    where: { id: data.vehicleId, companyId: user.companyId }
  });

  const document = await prisma.vehicleDocument.create({
    data: {
      companyId: user.companyId,
      vehicleId: vehicle.id,
      type: data.type,
      title: data.title,
      fileUrl: url,
      validUntil: data.validUntil,
      notes: data.notes,
      uploadedById: user.id
    }
  });

  await writeAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: "document.created",
    entityType: "VehicleDocument",
    entityId: document.id,
    metadata: { vehicleId: vehicle.id, type: document.type }
  });
  revalidatePath("/documents");
}

export async function deleteDocument(formData: FormData) {
  const user = await requireAuth();
  requireFleetAdmin(user);
  const company = await prisma.company.findUniqueOrThrow({ where: { id: user.companyId } });
  assertFeatureAccess(getPlan(company), "documentManagementAccess");
  const data = documentIdSchema.parse(toFormDataObject(formData));

  const document = await prisma.vehicleDocument.findFirstOrThrow({
    where: { id: data.documentId, companyId: user.companyId }
  });

  await prisma.vehicleDocument.delete({ where: { id: document.id } });

  await writeAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: "document.deleted",
    entityType: "VehicleDocument",
    entityId: document.id,
    metadata: { vehicleId: document.vehicleId, type: document.type }
  });
  revalidatePath("/documents");
}
