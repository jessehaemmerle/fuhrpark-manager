"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import {
  BookingStatus,
  DamageStatus,
  MaintenanceStatus,
  type UserRole,
  VehicleStatus
} from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import {
  assertTenantAccess,
  ensureDriverAllowed,
  hashPassword,
  requireAuth,
  requireCompanyScope,
  requireFleetAdmin,
  requireOwner,
  verifyPassword
} from "@/lib/auth";
import { bookingApprovedEmail, bookingRejectedEmail, sendEmail } from "@/lib/email";
import { assertValidTimeRange, assertVehicleAvailability, findActiveTripConflict, validateMileage } from "@/lib/availability";
import { assertFeatureAccess, assertWithinPlan, getPlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { normalizePhotoUrls, validatePhotoUrls } from "@/lib/upload";
import { toFormDataObject } from "@/lib/utils";
import {
  bookingDecisionSchema,
  bookingSchema,
  bookingStatusSchema,
  companySettingsSchema,
  damageSchema,
  damageStatusSchema,
  departmentSchema,
  driverPermissionSchema,
  handoverSchema,
  idSchema,
  maintenanceSchema,
  maintenanceStatusSchema,
  subscriptionTierSchema,
  tripCorrectionSchema,
  tripEndSchema,
  tripStartSchema,
  userCreateSchema,
  userUpdateSchema,
  vehicleSchema
} from "@/lib/validators";

function parseForm<T>(schema: { parse: (data: unknown) => T }, formData: FormData): T {
  return schema.parse(toFormDataObject(formData));
}

function qrToken() {
  return randomBytes(32).toString("base64url");
}

async function getScopedVehicle(vehicleId: string, companyId: string) {
  return prisma.vehicle.findFirstOrThrow({
    where: { id: vehicleId, companyId }
  });
}

async function getScopedBooking(bookingId: string, companyId: string) {
  return prisma.booking.findFirstOrThrow({
    where: { id: bookingId, companyId }
  });
}

function canManageTargetRole(actorRole: UserRole, targetRole: UserRole) {
  if (targetRole === "PLATFORM_ADMIN") return actorRole === "PLATFORM_ADMIN";
  if (actorRole === "FLEET_MANAGER") return targetRole === "USER";
  return actorRole === "OWNER" || actorRole === "PLATFORM_ADMIN";
}

export async function createVehicle(formData: FormData) {
  const user = await requireAuth();
  requireFleetAdmin(user);
  await assertWithinPlan(user.companyId, "vehicles");
  const data = parseForm(vehicleSchema, formData);

  if (data.qrCodeEnabled) {
    const company = await prisma.company.findUniqueOrThrow({ where: { id: user.companyId } });
    assertFeatureAccess(getPlan(company), "qrCodeAccess");
  }

  const vehicle = await prisma.vehicle.create({
    data: {
      ...data,
      companyId: user.companyId,
      qrCodeToken: data.qrCodeEnabled ? qrToken() : null
    }
  });

  await writeAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: "vehicle.created",
    entityType: "Vehicle",
    entityId: vehicle.id,
    metadata: { licensePlate: vehicle.licensePlate }
  });
  revalidatePath("/vehicles");
}

export async function updateVehicle(vehicleId: string, formData: FormData) {
  const user = await requireAuth();
  requireFleetAdmin(user);
  const existingVehicle = await getScopedVehicle(vehicleId, user.companyId);
  const data = parseForm(vehicleSchema, formData);

  if (data.qrCodeEnabled && !existingVehicle.qrCodeEnabled) {
    const company = await prisma.company.findUniqueOrThrow({ where: { id: user.companyId } });
    assertFeatureAccess(getPlan(company), "qrCodeAccess");
  }

  const vehicle = await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      ...data,
      qrCodeToken: data.qrCodeEnabled ? existingVehicle.qrCodeToken ?? qrToken() : null
    }
  });

  await writeAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: "vehicle.updated",
    entityType: "Vehicle",
    entityId: vehicle.id,
    metadata: { licensePlate: vehicle.licensePlate }
  });
  revalidatePath("/vehicles");
  revalidatePath(`/vehicles/${vehicle.id}`);
}

export async function archiveVehicle(formData: FormData) {
  const user = await requireAuth();
  requireFleetAdmin(user);
  const vehicleId = idSchema.parse(formData.get("vehicleId"));
  const vehicle = await getScopedVehicle(vehicleId, user.companyId);

  await prisma.vehicle.update({
    where: { id: vehicle.id },
    data: { status: VehicleStatus.RETIRED, qrCodeEnabled: false }
  });

  await writeAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: "vehicle.archived",
    entityType: "Vehicle",
    entityId: vehicle.id,
    metadata: { licensePlate: vehicle.licensePlate }
  });
  revalidatePath("/vehicles");
}

export async function regenerateVehicleQr(formData: FormData) {
  const user = await requireAuth();
  requireFleetAdmin(user);
  const vehicleId = idSchema.parse(formData.get("vehicleId"));
  const company = await prisma.company.findUniqueOrThrow({ where: { id: user.companyId } });
  assertFeatureAccess(getPlan(company), "qrCodeAccess");
  const vehicle = await getScopedVehicle(vehicleId, user.companyId);

  await prisma.vehicle.update({
    where: { id: vehicle.id },
    data: { qrCodeToken: qrToken(), qrCodeEnabled: true }
  });

  await writeAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: "vehicle.qr_regenerated",
    entityType: "Vehicle",
    entityId: vehicle.id
  });
  revalidatePath(`/vehicles/${vehicle.id}`);
  revalidatePath("/qr-workflows");
}

export async function disableVehicleQr(formData: FormData) {
  const user = await requireAuth();
  requireFleetAdmin(user);
  const vehicleId = idSchema.parse(formData.get("vehicleId"));
  const vehicle = await getScopedVehicle(vehicleId, user.companyId);

  await prisma.vehicle.update({
    where: { id: vehicle.id },
    data: { qrCodeEnabled: false }
  });

  await writeAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: "vehicle.qr_disabled",
    entityType: "Vehicle",
    entityId: vehicle.id
  });
  revalidatePath(`/vehicles/${vehicle.id}`);
  revalidatePath("/qr-workflows");
}

export async function createBooking(formData: FormData) {
  const user = await requireAuth();
  ensureDriverAllowed(user);
  await assertWithinPlan(user.companyId, "activeBookings");
  const data = parseForm(bookingSchema, formData);
  const vehicle = await getScopedVehicle(data.vehicleId, user.companyId);

  if (vehicle.status === "RETIRED" || vehicle.status === "DOWNTIME" || vehicle.status === "MAINTENANCE") {
    throw new Error("Dieses Fahrzeug ist aktuell nicht buchbar.");
  }

  await assertVehicleAvailability(user.companyId, data.vehicleId, {
    startAt: data.startAt,
    endAt: data.endAt
  });

  const booking = await prisma.booking.create({
    data: {
      ...data,
      companyId: user.companyId,
      userId: user.id,
      status: BookingStatus.PENDING
    }
  });

  await writeAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: "booking.requested",
    entityType: "Booking",
    entityId: booking.id,
    metadata: { vehicleId: data.vehicleId }
  });
  revalidatePath("/bookings");
  revalidatePath("/dashboard");
}

export async function approveBooking(formData: FormData) {
  const user = await requireAuth();
  requireFleetAdmin(user);
  const data = parseForm(bookingDecisionSchema, formData);
  const booking = await getScopedBooking(data.bookingId, user.companyId);

  await assertVehicleAvailability(
    user.companyId,
    booking.vehicleId,
    {
      startAt: booking.startAt,
      endAt: booking.endAt
    },
    booking.id
  );

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: BookingStatus.APPROVED,
      approvalNote: data.note,
      approvedById: user.id,
      approvedAt: new Date(),
      rejectedById: null,
      rejectedAt: null,
      rejectionNote: null
    }
  });

  await writeAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: "booking.approved",
    entityType: "Booking",
    entityId: booking.id,
    metadata: { note: data.note }
  });

  prisma.booking.findUnique({
    where: { id: booking.id },
    include: {
      user: { select: { name: true, email: true } },
      vehicle: { select: { brand: true, model: true, licensePlate: true } }
    }
  }).then((b) => {
    if (!b) return;
    const { subject, html } = bookingApprovedEmail({
      userName: b.user.name,
      vehicleName: `${b.vehicle.brand} ${b.vehicle.model}`,
      licensePlate: b.vehicle.licensePlate,
      startAt: b.startAt,
      endAt: b.endAt,
      note: data.note
    });
    sendEmail({ to: b.user.email, subject, html });
  }).catch(console.error);

  revalidatePath("/bookings");
  revalidatePath("/dashboard");
}

export async function rejectBooking(formData: FormData) {
  const user = await requireAuth();
  requireFleetAdmin(user);
  const data = parseForm(bookingDecisionSchema, formData);
  const booking = await getScopedBooking(data.bookingId, user.companyId);

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: BookingStatus.REJECTED,
      rejectionNote: data.note,
      rejectedById: user.id,
      rejectedAt: new Date()
    }
  });

  await writeAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: "booking.rejected",
    entityType: "Booking",
    entityId: booking.id,
    metadata: { note: data.note }
  });

  prisma.booking.findUnique({
    where: { id: booking.id },
    include: {
      user: { select: { name: true, email: true } },
      vehicle: { select: { brand: true, model: true, licensePlate: true } }
    }
  }).then((b) => {
    if (!b) return;
    const { subject, html } = bookingRejectedEmail({
      userName: b.user.name,
      vehicleName: `${b.vehicle.brand} ${b.vehicle.model}`,
      licensePlate: b.vehicle.licensePlate,
      startAt: b.startAt,
      endAt: b.endAt,
      note: data.note
    });
    sendEmail({ to: b.user.email, subject, html });
  }).catch(console.error);

  revalidatePath("/bookings");
  revalidatePath("/dashboard");
}

export async function updateBookingStatus(formData: FormData) {
  const user = await requireAuth();
  const data = parseForm(bookingStatusSchema, formData);
  const booking = await getScopedBooking(data.bookingId, user.companyId);
  if (![BookingStatus.CANCELLED, BookingStatus.COMPLETED].includes(data.status)) {
    throw new Error("Genehmigungen und Ablehnungen muessen ueber den passenden Workflow erfolgen.");
  }
  const mayUpdateOwn = booking.userId === user.id && data.status === BookingStatus.CANCELLED;

  if (!mayUpdateOwn) requireFleetAdmin(user);

  await prisma.booking.update({
    where: { id: booking.id },
    data: { status: data.status }
  });

  await writeAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: `booking.${data.status.toLowerCase()}`,
    entityType: "Booking",
    entityId: booking.id
  });
  revalidatePath("/bookings");
  revalidatePath("/dashboard");
}

export async function startTrip(formData: FormData) {
  const user = await requireAuth();
  ensureDriverAllowed(user);
  await assertWithinPlan(user.companyId, "monthlyTripLogs");
  const data = parseForm(tripStartSchema, formData);
  const vehicle = await getScopedVehicle(data.vehicleId, user.companyId);
  const activeTrip = await findActiveTripConflict(user.companyId, vehicle.id);

  if (activeTrip) {
    throw new Error("Dieses Fahrzeug hat bereits eine aktive Fahrt.");
  }

  if (data.bookingId) {
    const booking = await getScopedBooking(data.bookingId, user.companyId);
    if (booking.vehicleId !== data.vehicleId) throw new Error("Die Buchung gehoert nicht zu diesem Fahrzeug.");
    if (booking.userId !== user.id && user.role === "USER") throw new Error("Diese Buchung gehoert einem anderen Nutzer.");
    if (booking.status !== "APPROVED") throw new Error("Nur genehmigte Buchungen koennen gestartet werden.");
  }

  const trip = await prisma.tripLog.create({
    data: {
      companyId: user.companyId,
      vehicleId: vehicle.id,
      userId: user.id,
      bookingId: data.bookingId,
      startMileage: data.startMileage,
      startLocation: data.startLocation,
      destination: data.destination,
      purpose: data.purpose,
      tripType: data.tripType
    }
  });

  await prisma.vehicle.update({
    where: { id: vehicle.id },
    data: { status: VehicleStatus.IN_USE, mileage: Math.max(vehicle.mileage, data.startMileage) }
  });

  await writeAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: "trip.started",
    entityType: "TripLog",
    entityId: trip.id,
    metadata: { vehicleId: vehicle.id }
  });
  revalidatePath("/trip-log");
  if (vehicle.qrCodeToken) revalidatePath(`/v/${vehicle.qrCodeToken}`);
  revalidatePath("/dashboard");
}

export async function finishTrip(formData: FormData) {
  const user = await requireAuth();
  const data = parseForm(tripEndSchema, formData);
  const trip = await prisma.tripLog.findFirstOrThrow({
    where: { id: data.tripLogId, companyId: user.companyId },
    include: { vehicle: true }
  });

  if (trip.userId !== user.id && user.role === "USER") {
    throw new Error("Sie koennen nur eigene Fahrten abschliessen.");
  }
  if (trip.endAt) {
    throw new Error("Diese Fahrt ist bereits abgeschlossen.");
  }

  const distance = validateMileage(trip.startMileage, data.endMileage);
  await prisma.tripLog.update({
    where: { id: trip.id },
    data: {
      endAt: new Date(),
      endMileage: data.endMileage,
      distance,
      destination: data.destination ?? trip.destination,
      notes: data.notes,
      locked: true
    }
  });

  await prisma.vehicle.update({
    where: { id: trip.vehicleId },
    data: {
      mileage: Math.max(trip.vehicle.mileage, data.endMileage),
      status: VehicleStatus.AVAILABLE
    }
  });

  await writeAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: "trip.completed",
    entityType: "TripLog",
    entityId: trip.id,
    metadata: { distance }
  });
  revalidatePath("/trip-log");
  revalidatePath("/dashboard");
}

export async function correctTripLog(formData: FormData) {
  const user = await requireAuth();
  requireFleetAdmin(user);
  const data = parseForm(tripCorrectionSchema, formData);
  const trip = await prisma.tripLog.findFirstOrThrow({
    where: { id: data.tripLogId, companyId: user.companyId }
  });

  await prisma.tripLog.update({
    where: { id: trip.id },
    data: { correctionNote: data.correctionNote }
  });

  await writeAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: "trip.corrected",
    entityType: "TripLog",
    entityId: trip.id,
    metadata: { correctionNote: data.correctionNote }
  });
  revalidatePath("/trip-log");
}

export async function createMaintenance(formData: FormData) {
  const user = await requireAuth();
  requireFleetAdmin(user);
  const company = await prisma.company.findUniqueOrThrow({ where: { id: user.companyId } });
  assertFeatureAccess(getPlan(company), "maintenanceModuleAccess");
  const data = parseForm(maintenanceSchema, formData);
  assertValidTimeRange({ startAt: data.startAt, endAt: data.endAt });
  const vehicle = await getScopedVehicle(data.vehicleId, user.companyId);
  if (data.damageReportId) {
    await prisma.damageReport.findFirstOrThrow({
      where: { id: data.damageReportId, companyId: user.companyId, vehicleId: vehicle.id }
    });
  }

  const record = await prisma.maintenanceRecord.create({
    data: {
      ...data,
      companyId: user.companyId,
      vehicleId: vehicle.id,
      createdById: user.id
    }
  });

  if (record.status === "PLANNED" || record.status === "IN_PROGRESS") {
    await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: { status: VehicleStatus.MAINTENANCE }
    });
  }

  await writeAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: "maintenance.created",
    entityType: "MaintenanceRecord",
    entityId: record.id,
    metadata: { vehicleId: vehicle.id, cost: String(record.cost) }
  });
  revalidatePath("/maintenance");
  revalidatePath("/dashboard");
}

export async function updateMaintenanceStatus(formData: FormData) {
  const user = await requireAuth();
  requireFleetAdmin(user);
  const data = parseForm(maintenanceStatusSchema, formData);
  const record = await prisma.maintenanceRecord.findFirstOrThrow({
    where: { id: data.maintenanceId, companyId: user.companyId }
  });

  await prisma.maintenanceRecord.update({
    where: { id: record.id },
    data: { status: data.status }
  });

  if (data.status === MaintenanceStatus.COMPLETED || data.status === MaintenanceStatus.CANCELLED) {
    const activeTrip = await findActiveTripConflict(user.companyId, record.vehicleId);
    await prisma.vehicle.update({
      where: { id: record.vehicleId },
      data: { status: activeTrip ? VehicleStatus.IN_USE : VehicleStatus.AVAILABLE }
    });
  }

  await writeAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: `maintenance.${data.status.toLowerCase()}`,
    entityType: "MaintenanceRecord",
    entityId: record.id
  });
  revalidatePath("/maintenance");
  revalidatePath("/dashboard");
}

export async function createDamageReport(formData: FormData) {
  const user = await requireAuth();
  await assertWithinPlan(user.companyId, "monthlyDamageReports");
  const data = parseForm(damageSchema, formData);
  await getScopedVehicle(data.vehicleId, user.companyId);
  if (data.bookingId) {
    const booking = await getScopedBooking(data.bookingId, user.companyId);
    if (booking.vehicleId !== data.vehicleId) throw new Error("Die Buchung gehoert nicht zu diesem Fahrzeug.");
  }
  if (data.tripLogId) {
    const trip = await prisma.tripLog.findFirstOrThrow({
      where: { id: data.tripLogId, companyId: user.companyId }
    });
    if (trip.vehicleId !== data.vehicleId) throw new Error("Die Fahrt gehoert nicht zu diesem Fahrzeug.");
  }
  if (data.handoverId) {
    const handover = await prisma.vehicleHandover.findFirstOrThrow({
      where: { id: data.handoverId, companyId: user.companyId }
    });
    if (handover.vehicleId !== data.vehicleId) throw new Error("Die Uebergabe gehoert nicht zu diesem Fahrzeug.");
  }
  const photoUrls = validatePhotoUrls(normalizePhotoUrls(data.photoUrls));

  const report = await prisma.damageReport.create({
    data: {
      companyId: user.companyId,
      vehicleId: data.vehicleId,
      reporterUserId: user.id,
      bookingId: data.bookingId,
      tripLogId: data.tripLogId,
      handoverId: data.handoverId,
      title: data.title,
      description: data.description,
      damageLocation: data.damageLocation,
      severity: data.severity,
      photoUrls
    }
  });

  await writeAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: "damage.created",
    entityType: "DamageReport",
    entityId: report.id,
    metadata: { severity: report.severity, vehicleId: report.vehicleId }
  });
  revalidatePath("/damage-reports");
  revalidatePath("/dashboard");
}

export async function updateDamageStatus(formData: FormData) {
  const user = await requireAuth();
  requireFleetAdmin(user);
  const data = parseForm(damageStatusSchema, formData);
  const report = await prisma.damageReport.findFirstOrThrow({
    where: { id: data.damageReportId, companyId: user.companyId }
  });

  await prisma.damageReport.update({
    where: { id: report.id },
    data: {
      status: data.status,
      repairCost: data.repairCost,
      resolvedById: data.status === DamageStatus.RESOLVED ? user.id : undefined,
      resolvedAt: data.status === DamageStatus.RESOLVED ? new Date() : undefined
    }
  });

  await writeAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: `damage.${data.status.toLowerCase()}`,
    entityType: "DamageReport",
    entityId: report.id
  });
  revalidatePath("/damage-reports");
  revalidatePath("/dashboard");
}

export async function createHandover(formData: FormData) {
  const user = await requireAuth();
  const data = parseForm(handoverSchema, formData);
  const vehicle = await getScopedVehicle(data.vehicleId, user.companyId);
  let bookingId = data.bookingId;

  if (bookingId) {
    const booking = await getScopedBooking(bookingId, user.companyId);
    if (booking.vehicleId !== vehicle.id) throw new Error("Die Buchung gehoert nicht zum Fahrzeug.");
    if (booking.userId !== user.id && user.role === "USER") throw new Error("Diese Uebergabe gehoert nicht zu Ihrer Buchung.");
  }

  const photoUrls = validatePhotoUrls(normalizePhotoUrls(data.photoUrls));
  const handover = await prisma.vehicleHandover.create({
    data: {
      companyId: user.companyId,
      vehicleId: vehicle.id,
      bookingId,
      userId: user.id,
      type: data.type,
      handledAt: data.handledAt,
      mileage: data.mileage,
      energyLevel: data.energyLevel,
      exteriorConditionNote: data.exteriorConditionNote,
      interiorConditionNote: data.interiorConditionNote,
      existingDamageConfirmed: data.existingDamageConfirmed,
      newDamageReported: data.newDamageReported,
      signatureName: data.signatureName,
      photoUrls
    }
  });

  if (data.type === "RETURN") {
    await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: { mileage: Math.max(vehicle.mileage, data.mileage), status: VehicleStatus.AVAILABLE }
    });
  }

  const createdDamage =
    data.newDamageReported && data.createDamageTitle && data.createDamageDescription
      ? await prisma.damageReport.create({
          data: {
            companyId: user.companyId,
            vehicleId: vehicle.id,
            reporterUserId: user.id,
            bookingId,
            handoverId: handover.id,
            title: data.createDamageTitle,
            description: data.createDamageDescription,
            severity: "MEDIUM",
            photoUrls
          }
        })
      : null;

  await writeAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: `handover.${data.type.toLowerCase()}`,
    entityType: "VehicleHandover",
    entityId: handover.id,
    metadata: { vehicleId: vehicle.id }
  });
  if (createdDamage) {
    await writeAuditLog({
      companyId: user.companyId,
      actorUserId: user.id,
      action: "damage.created",
      entityType: "DamageReport",
      entityId: createdDamage.id,
      metadata: { source: "handover", handoverId: handover.id }
    });
  }
  revalidatePath("/handovers");
  revalidatePath("/dashboard");
}

export async function createDepartment(formData: FormData) {
  const user = await requireAuth();
  requireFleetAdmin(user);
  await assertWithinPlan(user.companyId, "departments");
  const data = parseForm(departmentSchema, formData);
  const department = await prisma.department.create({
    data: { ...data, companyId: user.companyId }
  });

  await writeAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: "department.created",
    entityType: "Department",
    entityId: department.id
  });
  revalidatePath("/departments");
}

export async function updateDepartment(departmentId: string, formData: FormData) {
  const user = await requireAuth();
  requireFleetAdmin(user);
  const data = parseForm(departmentSchema, formData);
  const department = await prisma.department.findFirstOrThrow({
    where: { id: departmentId, companyId: user.companyId }
  });

  await prisma.department.update({
    where: { id: department.id },
    data
  });

  await writeAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: "department.updated",
    entityType: "Department",
    entityId: department.id
  });
  revalidatePath("/departments");
}

export async function deleteDepartment(formData: FormData) {
  const user = await requireAuth();
  requireFleetAdmin(user);
  const departmentId = idSchema.parse(formData.get("departmentId"));
  const department = await prisma.department.findFirstOrThrow({
    where: { id: departmentId, companyId: user.companyId }
  });

  await prisma.department.delete({ where: { id: department.id } });
  await writeAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: "department.deleted",
    entityType: "Department",
    entityId: department.id
  });
  revalidatePath("/departments");
}

export async function createUser(formData: FormData) {
  const actor = await requireAuth();
  requireFleetAdmin(actor);
  await assertWithinPlan(actor.companyId, "users");
  const data = parseForm(userCreateSchema, formData);

  if (!canManageTargetRole(actor.role, data.role)) {
    throw new Error("Diese Rolle darf nicht vergeben werden.");
  }

  if (data.departmentId) {
    await prisma.department.findFirstOrThrow({
      where: { id: data.departmentId, companyId: actor.companyId }
    });
  }

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      companyId: actor.companyId,
      departmentId: data.departmentId,
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      driverApproved: data.driverApproved,
      driverBlocked: data.driverBlocked,
      licenseClass: data.licenseClass,
      licenseNumber: data.licenseNumber,
      licenseValidUntil: data.licenseValidUntil,
      driverNotes: data.driverNotes,
      lastLicenseCheckDate: new Date()
    }
  });

  await writeAuditLog({
    companyId: actor.companyId,
    actorUserId: actor.id,
    action: "user.created",
    entityType: "User",
    entityId: user.id,
    metadata: { role: user.role }
  });
  revalidatePath("/users");
}

export async function updateUser(formData: FormData) {
  const actor = await requireAuth();
  requireFleetAdmin(actor);
  const data = parseForm(userUpdateSchema, formData);
  const target = await prisma.user.findFirstOrThrow({
    where: { id: data.userId, companyId: actor.companyId }
  });

  if (!canManageTargetRole(actor.role, data.role)) {
    throw new Error("Diese Rolle darf nicht vergeben werden.");
  }
  if (target.role === "OWNER" && actor.role === "FLEET_MANAGER") {
    throw new Error("Fleet Manager duerfen Owner nicht bearbeiten.");
  }
  if (data.departmentId) {
    await prisma.department.findFirstOrThrow({
      where: { id: data.departmentId, companyId: actor.companyId }
    });
  }

  await prisma.user.update({
    where: { id: target.id },
    data: {
      departmentId: data.departmentId,
      name: data.name,
      email: data.email,
      role: data.role,
      active: data.active,
      driverApproved: data.driverApproved,
      driverBlocked: data.driverBlocked,
      licenseClass: data.licenseClass,
      licenseNumber: data.licenseNumber,
      licenseValidUntil: data.licenseValidUntil,
      driverNotes: data.driverNotes,
      passwordHash: data.password ? await hashPassword(data.password) : undefined
    }
  });

  await writeAuditLog({
    companyId: actor.companyId,
    actorUserId: actor.id,
    action: "user.updated",
    entityType: "User",
    entityId: target.id,
    metadata: { role: data.role, active: data.active }
  });
  revalidatePath("/users");
}

export async function deactivateUser(formData: FormData) {
  const actor = await requireAuth();
  requireFleetAdmin(actor);
  const userId = idSchema.parse(formData.get("userId"));
  if (userId === actor.id) throw new Error("Sie koennen sich nicht selbst deaktivieren.");
  const target = await prisma.user.findFirstOrThrow({ where: { id: userId, companyId: actor.companyId } });

  await prisma.user.update({ where: { id: target.id }, data: { active: false } });
  await writeAuditLog({
    companyId: actor.companyId,
    actorUserId: actor.id,
    action: "user.deactivated",
    entityType: "User",
    entityId: target.id
  });
  revalidatePath("/users");
}

export async function updateDriverPermissions(formData: FormData) {
  const actor = await requireAuth();
  requireFleetAdmin(actor);
  const company = await prisma.company.findUniqueOrThrow({ where: { id: actor.companyId } });
  assertFeatureAccess(getPlan(company), "driverPermissionAccess");
  const data = parseForm(driverPermissionSchema, formData);
  const target = await prisma.user.findFirstOrThrow({ where: { id: data.userId, companyId: actor.companyId } });

  await prisma.user.update({
    where: { id: target.id },
    data: {
      driverApproved: data.driverApproved,
      driverBlocked: data.driverBlocked,
      licenseClass: data.licenseClass,
      licenseNumber: data.licenseNumber,
      licenseValidUntil: data.licenseValidUntil,
      lastLicenseCheckDate: data.lastLicenseCheckDate ?? new Date(),
      driverNotes: data.driverNotes
    }
  });

  await writeAuditLog({
    companyId: actor.companyId,
    actorUserId: actor.id,
    action: "driver_permission.changed",
    entityType: "User",
    entityId: target.id,
    metadata: {
      driverApproved: data.driverApproved,
      driverBlocked: data.driverBlocked,
      licenseValidUntil: data.licenseValidUntil?.toISOString()
    }
  });
  revalidatePath("/users");
}

export async function updateCompanySettings(formData: FormData) {
  const user = await requireAuth();
  requireOwner(user);
  const data = parseForm(companySettingsSchema, formData);
  const company = await prisma.company.findUniqueOrThrow({ where: { id: user.companyId } });
  const plan = getPlan(company);
  const nextLogoUrl = data.logoUrl ?? null;

  const brandingChanged =
    nextLogoUrl !== (company.logoUrl ?? null) || data.primaryBrandColor !== company.primaryBrandColor;
  if (brandingChanged) {
    assertFeatureAccess(plan, "customBrandingAccess");
  }

  await prisma.company.update({
    where: { id: company.id },
    data: {
      ...data,
      logoUrl: nextLogoUrl
    }
  });

  await writeAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: "company.settings_changed",
    entityType: "Company",
    entityId: company.id
  });
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function changeSubscriptionTier(formData: FormData) {
  const user = await requireAuth();
  requireOwner(user);
  const data = parseForm(subscriptionTierSchema, formData);
  const company = await prisma.company.findUniqueOrThrow({ where: { id: user.companyId } });

  requireCompanyScope(user, company.id);
  await prisma.company.update({
    where: { id: company.id },
    data: { subscriptionTier: data.tier }
  });

  await writeAuditLog({
    companyId: company.id,
    actorUserId: user.id,
    action: "subscription.tier_changed",
    entityType: "Company",
    entityId: company.id,
    metadata: { from: company.subscriptionTier, to: data.tier, paymentIntegration: "not_configured" }
  });
  revalidatePath("/subscription");
  revalidatePath("/dashboard");
}

export async function changeOwnPassword(formData: FormData) {
  const user = await requireAuth();
  const currentPassword = formData.get("currentPassword");
  const newPassword = formData.get("newPassword");
  const confirmPassword = formData.get("confirmPassword");

  if (typeof currentPassword !== "string" || !currentPassword) throw new Error("Aktuelles Passwort fehlt.");
  if (typeof newPassword !== "string" || newPassword.length < 10) throw new Error("Neues Passwort muss mindestens 10 Zeichen haben.");
  if (newPassword !== confirmPassword) throw new Error("Die Passwoerter stimmen nicht ueberein.");

  const { passwordHash } = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { passwordHash: true }
  });

  const valid = await verifyPassword(currentPassword, passwordHash);
  if (!valid) throw new Error("Das aktuelle Passwort ist falsch.");

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) }
  });

  await writeAuditLog({
    companyId: user.companyId,
    actorUserId: user.id,
    action: "user.password_changed",
    entityType: "User",
    entityId: user.id
  });
  revalidatePath("/profile");
}

export async function assertVehicleTokenAccess(token: string) {
  const user = await requireAuth();
  const vehicle = await prisma.vehicle.findFirstOrThrow({
    where: { qrCodeToken: token, qrCodeEnabled: true },
    include: { company: true }
  });
  assertTenantAccess(user, vehicle.companyId);

  await writeAuditLog({
    companyId: vehicle.companyId,
    actorUserId: user.id,
    action: "vehicle.qr_opened",
    entityType: "Vehicle",
    entityId: vehicle.id
  });

  return vehicle;
}
