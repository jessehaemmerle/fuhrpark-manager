import "server-only";

import { addDays, startOfMonth } from "date-fns";
import { BookingStatus, DamageSeverity, DamageStatus, MaintenanceStatus, TripType, VehicleStatus } from "@prisma/client";
import { getCompanyUsage, getPlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";

export async function getDashboardData(companyId: string) {
  const monthStart = startOfMonth(new Date());
  const next30Days = addDays(new Date(), 30);

  const [
    totalVehicles,
    availableVehicles,
    vehiclesInUse,
    vehiclesInMaintenance,
    pendingBookings,
    approvedBookingsThisMonth,
    activeTrips,
    openDamageReports,
    upcomingMaintenance,
    maintenanceCosts,
    expiringDrivers,
    recentBookings,
    company,
    usage,
    vehiclesWithServiceMileage
  ] = await Promise.all([
    prisma.vehicle.count({ where: { companyId, status: { not: VehicleStatus.RETIRED } } }),
    prisma.vehicle.count({ where: { companyId, status: VehicleStatus.AVAILABLE } }),
    prisma.vehicle.count({ where: { companyId, status: VehicleStatus.IN_USE } }),
    prisma.vehicle.count({ where: { companyId, status: VehicleStatus.MAINTENANCE } }),
    prisma.booking.count({ where: { companyId, status: BookingStatus.PENDING } }),
    prisma.booking.count({
      where: {
        companyId,
        status: BookingStatus.APPROVED,
        approvedAt: { gte: monthStart }
      }
    }),
    prisma.tripLog.count({ where: { companyId, endAt: null } }),
    prisma.damageReport.count({
      where: {
        companyId,
        status: { in: [DamageStatus.OPEN, DamageStatus.IN_REVIEW, DamageStatus.SCHEDULED_FOR_REPAIR] }
      }
    }),
    prisma.maintenanceRecord.findMany({
      where: {
        companyId,
        status: { in: [MaintenanceStatus.PLANNED, MaintenanceStatus.IN_PROGRESS] },
        startAt: { lte: next30Days }
      },
      include: { vehicle: true },
      orderBy: { startAt: "asc" },
      take: 5
    }),
    prisma.maintenanceRecord.aggregate({
      where: {
        companyId,
        createdAt: { gte: monthStart },
        status: { not: MaintenanceStatus.CANCELLED }
      },
      _sum: { cost: true }
    }),
    prisma.user.findMany({
      where: {
        companyId,
        active: true,
        licenseValidUntil: {
          lte: next30Days
        }
      },
      orderBy: { licenseValidUntil: "asc" },
      take: 6
    }),
    prisma.booking.findMany({
      where: { companyId },
      include: { vehicle: true, user: true },
      orderBy: { createdAt: "desc" },
      take: 6
    }),
    prisma.company.findUniqueOrThrow({ where: { id: companyId } }),
    getCompanyUsage(companyId),
    prisma.vehicle.findMany({
      where: { companyId, status: { not: VehicleStatus.RETIRED }, nextServiceMileage: { not: null } },
      select: { id: true, licensePlate: true, brand: true, model: true, mileage: true, nextServiceMileage: true },
      orderBy: { licensePlate: "asc" }
    })
  ]);

  const vehiclesNearService = vehiclesWithServiceMileage
    .map((v) => ({ ...v, kmUntilService: (v.nextServiceMileage as number) - v.mileage }))
    .filter((v) => v.kmUntilService <= 1000)
    .sort((a, b) => a.kmUntilService - b.kmUntilService);

  return {
    metrics: {
      totalVehicles,
      availableVehicles,
      vehiclesInUse,
      vehiclesInMaintenance,
      pendingBookings,
      approvedBookingsThisMonth,
      activeTrips,
      openDamageReports,
      upcomingMaintenanceCount: upcomingMaintenance.length,
      maintenanceCostsThisMonth: Number(maintenanceCosts._sum.cost ?? 0),
      expiringDrivers: expiringDrivers.length,
      vehiclesNearServiceCount: vehiclesNearService.length
    },
    upcomingMaintenance,
    expiringDrivers,
    recentBookings,
    vehiclesNearService,
    company,
    plan: getPlan(company),
    usage
  };
}

type ReportFilters = {
  start?: string;
  end?: string;
  vehicleId?: string;
  userId?: string;
  departmentId?: string;
  tripType?: string;
  damageSeverity?: string;
};

function dateWindow(filters?: ReportFilters) {
  const createdAt: { gte?: Date; lte?: Date } = {};
  if (filters?.start) createdAt.gte = new Date(filters.start);
  if (filters?.end) createdAt.lte = new Date(filters.end);
  return Object.keys(createdAt).length > 0 ? createdAt : undefined;
}

export async function getReportData(companyId: string, filters: ReportFilters = {}) {
  const createdAt = dateWindow(filters);
  const vehicleId = filters.vehicleId || undefined;
  const userId = filters.userId || undefined;
  const departmentId = filters.departmentId || undefined;
  const tripType = filters.tripType ? (filters.tripType as TripType) : undefined;
  const damageSeverity = filters.damageSeverity ? (filters.damageSeverity as DamageSeverity) : undefined;
  const [vehicleUtilization, maintenanceCosts, damageBySeverity, tripsByVehicle, bookingsByDepartment] =
    await Promise.all([
      prisma.vehicle.findMany({
        where: { companyId, id: vehicleId, status: { not: "RETIRED" } },
        include: {
          bookings: {
            where: {
              status: { in: ["APPROVED", "COMPLETED"] },
              createdAt,
              userId,
              user: departmentId ? { departmentId } : undefined
            },
            select: { id: true }
          },
          tripLogs: {
            where: {
              createdAt,
              userId,
              tripType,
              user: departmentId ? { departmentId } : undefined
            },
            select: { distance: true }
          }
        }
      }),
      prisma.maintenanceRecord.groupBy({
        by: ["vehicleId"],
        where: { companyId, vehicleId, createdAt, status: { not: "CANCELLED" } },
        _sum: { cost: true }
      }),
      prisma.damageReport.groupBy({
        by: ["severity"],
        where: {
          companyId,
          vehicleId,
          createdAt,
          reporterUserId: userId,
          severity: damageSeverity
        },
        _count: true
      }),
      prisma.tripLog.groupBy({
        by: ["vehicleId"],
        where: {
          companyId,
          vehicleId,
          userId,
          createdAt,
          tripType,
          user: departmentId ? { departmentId } : undefined
        },
        _sum: { distance: true }
      }),
      prisma.booking.findMany({
        where: {
          companyId,
          vehicleId,
          userId,
          createdAt,
          user: departmentId ? { departmentId } : undefined
        },
        include: {
          user: {
            include: { department: true }
          }
        }
      })
    ]);

  const costsByVehicle = new Map(maintenanceCosts.map((row) => [row.vehicleId, Number(row._sum.cost ?? 0)]));
  const distanceByVehicle = new Map(tripsByVehicle.map((row) => [row.vehicleId, row._sum.distance ?? 0]));
  const departmentCounts = bookingsByDepartment.reduce<Record<string, number>>((acc, booking) => {
    const key = booking.user.department?.name ?? "Ohne Abteilung";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return {
    vehicleUtilization: vehicleUtilization.map((vehicle) => ({
      name: `${vehicle.brand} ${vehicle.model}`,
      bookings: vehicle.bookings.length,
      distance: distanceByVehicle.get(vehicle.id) ?? 0,
      maintenanceCost: costsByVehicle.get(vehicle.id) ?? 0
    })),
    damageBySeverity: damageBySeverity.map((row) => ({
      severity: row.severity,
      count: row._count
    })),
    bookingsByDepartment: Object.entries(departmentCounts).map(([department, count]) => ({
      department,
      count
    }))
  };
}
