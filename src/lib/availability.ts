import "server-only";

import { BookingStatus, MaintenanceStatus } from "@prisma/client";
import { calculateDistance, rangesOverlap } from "@/lib/domain-rules";
import { prisma } from "@/lib/prisma";

export type TimeRange = {
  startAt: Date;
  endAt: Date;
};

export function assertValidTimeRange(range: TimeRange) {
  if (!(range.startAt < range.endAt)) {
    throw new Error("Der Startzeitpunkt muss vor dem Endzeitpunkt liegen.");
  }
}

export async function findBookingConflicts(companyId: string, vehicleId: string, range: TimeRange, ignoreBookingId?: string) {
  assertValidTimeRange(range);
  return prisma.booking.findMany({
    where: {
      companyId,
      vehicleId,
      id: ignoreBookingId ? { not: ignoreBookingId } : undefined,
      status: { in: [BookingStatus.PENDING, BookingStatus.APPROVED] },
      startAt: { lt: range.endAt },
      endAt: { gt: range.startAt }
    },
    select: { id: true, startAt: true, endAt: true, status: true }
  });
}

export async function findMaintenanceConflicts(companyId: string, vehicleId: string, range: TimeRange) {
  assertValidTimeRange(range);
  return prisma.maintenanceRecord.findMany({
    where: {
      companyId,
      vehicleId,
      status: { in: [MaintenanceStatus.PLANNED, MaintenanceStatus.IN_PROGRESS] },
      startAt: { lt: range.endAt },
      endAt: { gt: range.startAt }
    },
    select: { id: true, startAt: true, endAt: true, status: true, title: true }
  });
}

export async function findActiveTripConflict(companyId: string, vehicleId: string) {
  return prisma.tripLog.findFirst({
    where: {
      companyId,
      vehicleId,
      endAt: null
    },
    select: { id: true, userId: true, startAt: true }
  });
}

export async function assertVehicleAvailability(companyId: string, vehicleId: string, range: TimeRange, ignoreBookingId?: string) {
  const [bookingConflicts, maintenanceConflicts, activeTrip] = await Promise.all([
    findBookingConflicts(companyId, vehicleId, range, ignoreBookingId),
    findMaintenanceConflicts(companyId, vehicleId, range),
    findActiveTripConflict(companyId, vehicleId)
  ]);

  if (bookingConflicts.length > 0) {
    throw new Error("Das Fahrzeug ist im gewaehlten Zeitraum bereits angefragt oder gebucht.");
  }
  if (maintenanceConflicts.length > 0) {
    throw new Error("Das Fahrzeug ist im gewaehlten Zeitraum durch Wartung oder Ausfall blockiert.");
  }
  if (activeTrip) {
    throw new Error("Das Fahrzeug hat aktuell eine aktive Fahrt.");
  }
}

export function validateMileage(startMileage: number, endMileage: number) {
  return calculateDistance(startMileage, endMileage);
}
