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
  requireRole
} from "@/lib/auth";
import { assertValidTimeRange, assertVehicleAvailability, findActiveTripConflict, validateMileage } from "@/lib/availability";
import { assertFeatureAccess, assertWithinPlan, getPlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { normalizePhotoUrls, validatePhotoUrls } from "@/lib/upload";
import { slugify, toFormDataObject } from "@/lib/utils";
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
  platformCompanyCreateSchema,
  platformCompanyUpdateSchema,
  platformLicenseCreateSchema,
  platformLicenseIdSchema,
  platformLicenseUpdateSchema,
  platformUserAccessSchema,
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

function licenseKey() {
  const raw = randomBytes(16).toString("hex").toUpperCase();
  return `FB-${raw.match(/.{1,4}/g)?.join("-") ?? raw}`;
}

async function uniqueLicenseKey() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const key = licenseKey();
    const existing = await prisma.license.findUnique({ where: { licenseKey: key }, select: { id: true } });
    if (!existing) return key;
  }

  throw new Error("Lizenzschluessel konnte nicht erzeugt werden.");
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

function futureDateFromDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

async function syncCompanyFromLatestActiveLicense(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, isPlatformCompany: true }
  });

  if (!company || company.isPlatformCompany) return;

  const activeLicense = await prisma.license.findFirst({
    where: { companyId, status: "ACTIVE" },
    orderBy: [{ validUntil: "desc" }, { createdAt: "desc" }]
  });

  if (activeLicense) {
    await prisma.company.update({
      where: { id: companyId },
      data: {
        subscriptionTier: activeLicense.tier,
        trialEndDate: activeLicense.validUntil,
        active: true
      }
    });
    return;
  }

  await prisma.company.update({
    where: { id: companyId },
    data: { active: false }
  });
}

const directBookingStatuses = [BookingStatus.CANCELLED, BookingStatus.COMPLETED] as const;

function isDirectBookingStatus(status: BookingStatus): status is (typeof directBookingStatuses)[number] {
  return directBookingStatuses.includes(status as (typeof directBookingStatuses)[number]);
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
  return actorRole === "OWNER" || actorRole === "PLATFORM_ADMIN";
}

export async function createVehicle(formData: FormData) {
  const user = await requireAuth();
  requireFleetAdmin(user);
  await assertWithinPlan(user.companyId, "vehicles");
  const company = await prisma.company.findUniqueOrThrow({ where: { id: user.companyId } });
  assertFeatureAccess(getPlan(company), "qrCodeAccess");

  const data = parseForm(vehicleSchema, formData);
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
  revalidatePath("/bookings");
  revalidatePath("/dashboard");
}

export async function updateBookingStatus(formData: FormData) {
  const user = await requireAuth();
  const data = parseForm(bookingStatusSchema, formData);
  const booking = await getScopedBooking(data.bookingId, user.companyId);
  if (!isDirectBookingStatus(data.status)) {
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
  revalidatePath(`/v/${vehicle.qrCodeToken}`);
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
  requireOwner(user);
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
  requireOwner(user);
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
  requireOwner(user);
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
  requireOwner(actor);
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
      passwordChangedAt: new Date(),
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
  revalidatePath("/admin");
}

export async function updateUser(formData: FormData) {
  const actor = await requireAuth();
  requireOwner(actor);
  const data = parseForm(userUpdateSchema, formData);
  const target = await prisma.user.findFirstOrThrow({
    where: { id: data.userId, companyId: actor.companyId }
  });

  if (!canManageTargetRole(actor.role, data.role)) {
    throw new Error("Diese Rolle darf nicht vergeben werden.");
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
      passwordHash: data.password ? await hashPassword(data.password) : undefined,
      passwordChangedAt: data.password ? new Date() : undefined,
      mustChangePassword: data.password ? false : undefined,
      temporaryPasswordIssuedAt: data.password ? null : undefined,
      passwordResetTokenHash: data.password ? null : undefined,
      passwordResetTokenExpiresAt: data.password ? null : undefined,
      passwordResetRequestedAt: data.password ? null : undefined
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
  revalidatePath("/admin");
}

export async function deactivateUser(formData: FormData) {
  const actor = await requireAuth();
  requireOwner(actor);
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
  revalidatePath("/admin");
}

export async function updateDriverPermissions(formData: FormData) {
  const actor = await requireAuth();
  requireOwner(actor);
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
  revalidatePath("/admin");
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

export async function createPlatformCompany(formData: FormData) {
  const actor = await requireRole(["PLATFORM_ADMIN"]);
  const data = parseForm(platformCompanyCreateSchema, formData);
  const slug = await uniqueCompanySlug(data.name);
  const trialStartDate = new Date();
  const company = await prisma.company.create({
    data: {
      name: data.name,
      slug,
      address: data.address ?? null,
      country: data.country,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone ?? null,
      primaryBrandColor: data.primaryBrandColor,
      subscriptionTier: data.subscriptionTier,
      trialStartDate,
      trialEndDate: futureDateFromDays(data.trialDays),
      active: data.active,
      isPlatformCompany: false
    }
  });

  await writeAuditLog({
    companyId: company.id,
    actorUserId: actor.id,
    action: "platform.company_created",
    entityType: "Company",
    entityId: company.id,
    metadata: {
      slug: company.slug,
      tier: company.subscriptionTier,
      active: company.active,
      source: "platform_admin"
    }
  });

  revalidatePath("/admin");
}

export async function updatePlatformCompany(formData: FormData) {
  const actor = await requireRole(["PLATFORM_ADMIN"]);
  const data = parseForm(platformCompanyUpdateSchema, formData);
  const existing = await prisma.company.findFirstOrThrow({
    where: { id: data.companyId, isPlatformCompany: false }
  });

  const company = await prisma.company.update({
    where: { id: existing.id },
    data: {
      name: data.name,
      address: data.address ?? null,
      country: data.country,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone ?? null,
      primaryBrandColor: data.primaryBrandColor,
      subscriptionTier: data.subscriptionTier,
      trialEndDate: data.trialEndDate,
      active: data.active
    }
  });

  await writeAuditLog({
    companyId: company.id,
    actorUserId: actor.id,
    action: "platform.company_updated",
    entityType: "Company",
    entityId: company.id,
    metadata: {
      fromTier: existing.subscriptionTier,
      toTier: company.subscriptionTier,
      active: company.active
    }
  });

  revalidatePath("/admin");
  revalidatePath("/subscription");
  revalidatePath("/dashboard");
}

export async function createPlatformLicense(formData: FormData) {
  const actor = await requireRole(["PLATFORM_ADMIN"]);
  const data = parseForm(platformLicenseCreateSchema, formData);
  const company = await prisma.company.findFirstOrThrow({ where: { id: data.companyId, isPlatformCompany: false } });
  const licenseKey = await uniqueLicenseKey();
  const initialUserPasswordHash =
    data.createInitialUser && data.initialUserTemporaryPassword ? await hashPassword(data.initialUserTemporaryPassword) : null;
  const result = await prisma.$transaction(async (tx) => {
    const license = await tx.license.create({
      data: {
        companyId: company.id,
        licenseKey,
        name: data.name,
        tier: data.tier,
        validFrom: data.validFrom,
        validUntil: data.validUntil,
        maxUsers: data.maxUsers ?? null,
        maxVehicles: data.maxVehicles ?? null,
        notes: data.notes ?? null,
        createdById: actor.id
      }
    });

    const initialUser =
      data.createInitialUser && data.initialUserName && data.initialUserEmail && initialUserPasswordHash
        ? await tx.user.create({
            data: {
              companyId: company.id,
              name: data.initialUserName,
              email: data.initialUserEmail.toLowerCase(),
              passwordHash: initialUserPasswordHash,
              role: data.initialUserRole,
              active: true,
              driverApproved: data.initialUserRole === "OWNER" || data.initialUserRole === "FLEET_MANAGER",
              mustChangePassword: true,
              temporaryPasswordIssuedAt: new Date()
            }
          })
        : null;

    return { license, initialUser };
  });

  await syncCompanyFromLatestActiveLicense(company.id);
  await writeAuditLog({
    companyId: company.id,
    actorUserId: actor.id,
    action: "platform.license_created",
    entityType: "License",
    entityId: result.license.id,
    metadata: {
      licenseKey: result.license.licenseKey,
      tier: result.license.tier,
      validUntil: result.license.validUntil.toISOString(),
      initialUserEmail: result.initialUser?.email
    }
  });
  if (result.initialUser) {
    await writeAuditLog({
      companyId: company.id,
      actorUserId: actor.id,
      action: "platform.initial_user_created",
      entityType: "User",
      entityId: result.initialUser.id,
      metadata: {
        email: result.initialUser.email,
        role: result.initialUser.role,
        mustChangePassword: true
      }
    });
  }
  revalidatePath("/admin");
  revalidatePath("/users");
  revalidatePath("/subscription");
  revalidatePath("/dashboard");
}

export async function updatePlatformLicense(formData: FormData) {
  const actor = await requireRole(["PLATFORM_ADMIN"]);
  const data = parseForm(platformLicenseUpdateSchema, formData);
  const existing = await prisma.license.findFirstOrThrow({
    where: { id: data.licenseId, company: { isPlatformCompany: false } }
  });
  await prisma.company.findFirstOrThrow({ where: { id: data.companyId, isPlatformCompany: false }, select: { id: true } });
  const license = await prisma.license.update({
    where: { id: existing.id },
    data: {
      companyId: data.companyId,
      name: data.name,
      status: data.status,
      tier: data.tier,
      validFrom: data.validFrom,
      validUntil: data.validUntil,
      maxUsers: data.maxUsers ?? null,
      maxVehicles: data.maxVehicles ?? null,
      notes: data.notes ?? null,
      archivedAt: data.status === "ARCHIVED" ? existing.archivedAt ?? new Date() : null
    }
  });

  await syncCompanyFromLatestActiveLicense(existing.companyId);
  if (license.companyId !== existing.companyId) {
    await syncCompanyFromLatestActiveLicense(license.companyId);
  }
  await writeAuditLog({
    companyId: license.companyId,
    actorUserId: actor.id,
    action: "platform.license_updated",
    entityType: "License",
    entityId: license.id,
    metadata: {
      licenseKey: license.licenseKey,
      status: license.status,
      tier: license.tier
    }
  });
  revalidatePath("/admin");
  revalidatePath("/subscription");
  revalidatePath("/dashboard");
}

export async function archivePlatformLicense(formData: FormData) {
  const actor = await requireRole(["PLATFORM_ADMIN"]);
  const data = parseForm(platformLicenseIdSchema, formData);
  const existing = await prisma.license.findFirstOrThrow({
    where: { id: data.licenseId, company: { isPlatformCompany: false } }
  });
  const license = await prisma.license.update({
    where: { id: existing.id },
    data: {
      status: "ARCHIVED",
      archivedAt: new Date()
    }
  });

  await syncCompanyFromLatestActiveLicense(license.companyId);
  await writeAuditLog({
    companyId: license.companyId,
    actorUserId: actor.id,
    action: "platform.license_archived",
    entityType: "License",
    entityId: license.id,
    metadata: { licenseKey: license.licenseKey }
  });
  revalidatePath("/admin");
  revalidatePath("/subscription");
  revalidatePath("/dashboard");
}

export async function deletePlatformLicense(formData: FormData) {
  const actor = await requireRole(["PLATFORM_ADMIN"]);
  const data = parseForm(platformLicenseIdSchema, formData);
  const license = await prisma.license.findFirstOrThrow({
    where: { id: data.licenseId, company: { isPlatformCompany: false } }
  });
  await prisma.license.delete({ where: { id: license.id } });
  await syncCompanyFromLatestActiveLicense(license.companyId);
  await writeAuditLog({
    companyId: license.companyId,
    actorUserId: actor.id,
    action: "platform.license_deleted",
    entityType: "License",
    entityId: license.id,
    metadata: { licenseKey: license.licenseKey }
  });
  revalidatePath("/admin");
  revalidatePath("/subscription");
  revalidatePath("/dashboard");
}

export async function updatePlatformUserAccess(formData: FormData) {
  const actor = await requireRole(["PLATFORM_ADMIN"]);
  const data = parseForm(platformUserAccessSchema, formData);
  const target = await prisma.user.findUniqueOrThrow({
    where: { id: data.userId },
    include: { company: true }
  });

  if (target.id === actor.id && !data.active) {
    throw new Error("Sie koennen den eigenen Super-Admin-Zugang nicht deaktivieren.");
  }
  if (!target.company.isPlatformCompany && data.role === "PLATFORM_ADMIN") {
    throw new Error("Super-Admin-Rollen duerfen nicht an Mandanten gebunden werden.");
  }
  if (target.company.isPlatformCompany && data.role !== "PLATFORM_ADMIN") {
    throw new Error("Plattformzugänge muessen Super-Admin-Rollen behalten.");
  }

  await prisma.user.update({
    where: { id: target.id },
    data: {
      role: data.role,
      active: data.active,
      passwordHash: data.password ? await hashPassword(data.password) : undefined,
      passwordChangedAt: data.password ? null : undefined,
      mustChangePassword: data.password ? true : undefined,
      temporaryPasswordIssuedAt: data.password ? new Date() : undefined,
      passwordResetTokenHash: data.password ? null : undefined,
      passwordResetTokenExpiresAt: data.password ? null : undefined,
      passwordResetRequestedAt: data.password ? null : undefined
    }
  });

  await writeAuditLog({
    companyId: target.companyId,
    actorUserId: actor.id,
    action: "platform.user_access_updated",
    entityType: "User",
    entityId: target.id,
    metadata: {
      email: target.email,
      fromRole: target.role,
      toRole: data.role,
      active: data.active,
      passwordChanged: Boolean(data.password),
      mustChangePassword: Boolean(data.password)
    }
  });
  revalidatePath("/admin");
  revalidatePath("/users");
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
