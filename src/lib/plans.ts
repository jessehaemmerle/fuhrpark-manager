import "server-only";

import { BookingStatus, type Company, type SubscriptionTier } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { monthRange } from "@/lib/utils";

export type PlanConfig = {
  tier: SubscriptionTier;
  name: string;
  monthlyPrice: string;
  maxVehicles: number;
  maxUsers: number;
  maxDepartments: number;
  maxActiveBookings: number;
  maxMonthlyTripLogs: number;
  maxMonthlyDamageReports: number;
  analyticsAccess: boolean;
  csvExportAccess: boolean;
  customBrandingAccess: boolean;
  qrCodeAccess: boolean;
  maintenanceModuleAccess: boolean;
  driverPermissionAccess: boolean;
  costTrackingAccess: boolean;
  documentManagementAccess: boolean;
  complianceAccess: boolean;
  prioritySupport: boolean;
};

export const UNLIMITED_LIMIT = 999_999;

export const PLAN_CONFIG: Record<SubscriptionTier, PlanConfig> = {
  TRIAL: {
    tier: "TRIAL",
    name: "Trial",
    monthlyPrice: "0 EUR / 14 Tage",
    maxVehicles: 5,
    maxUsers: 8,
    maxDepartments: 3,
    maxActiveBookings: 10,
    maxMonthlyTripLogs: 60,
    maxMonthlyDamageReports: 20,
    analyticsAccess: false,
    csvExportAccess: false,
    customBrandingAccess: false,
    qrCodeAccess: true,
    maintenanceModuleAccess: true,
    driverPermissionAccess: true,
    costTrackingAccess: false,
    documentManagementAccess: false,
    complianceAccess: true,
    prioritySupport: false
  },
  BASIC: {
    tier: "BASIC",
    name: "Basic",
    monthlyPrice: "49 EUR / Monat",
    maxVehicles: 10,
    maxUsers: 25,
    maxDepartments: 8,
    maxActiveBookings: 40,
    maxMonthlyTripLogs: 400,
    maxMonthlyDamageReports: 80,
    analyticsAccess: false,
    csvExportAccess: true,
    customBrandingAccess: false,
    qrCodeAccess: true,
    maintenanceModuleAccess: true,
    driverPermissionAccess: true,
    costTrackingAccess: true,
    documentManagementAccess: false,
    complianceAccess: true,
    prioritySupport: false
  },
  PROFESSIONAL: {
    tier: "PROFESSIONAL",
    name: "Professional",
    monthlyPrice: "149 EUR / Monat",
    maxVehicles: 75,
    maxUsers: 250,
    maxDepartments: 40,
    maxActiveBookings: 500,
    maxMonthlyTripLogs: 6000,
    maxMonthlyDamageReports: 800,
    analyticsAccess: true,
    csvExportAccess: true,
    customBrandingAccess: true,
    qrCodeAccess: true,
    maintenanceModuleAccess: true,
    driverPermissionAccess: true,
    costTrackingAccess: true,
    documentManagementAccess: true,
    complianceAccess: true,
    prioritySupport: true
  },
  ENTERPRISE: {
    tier: "ENTERPRISE",
    name: "Enterprise",
    monthlyPrice: "Individuell",
    maxVehicles: UNLIMITED_LIMIT,
    maxUsers: UNLIMITED_LIMIT,
    maxDepartments: UNLIMITED_LIMIT,
    maxActiveBookings: UNLIMITED_LIMIT,
    maxMonthlyTripLogs: UNLIMITED_LIMIT,
    maxMonthlyDamageReports: UNLIMITED_LIMIT,
    analyticsAccess: true,
    csvExportAccess: true,
    customBrandingAccess: true,
    qrCodeAccess: true,
    maintenanceModuleAccess: true,
    driverPermissionAccess: true,
    costTrackingAccess: true,
    documentManagementAccess: true,
    complianceAccess: true,
    prioritySupport: true
  }
};

export type UsageMetric =
  | "vehicles"
  | "users"
  | "departments"
  | "activeBookings"
  | "monthlyTripLogs"
  | "monthlyDamageReports";

export type CompanyUsage = Record<UsageMetric, number>;

export function getPlan(companyOrTier: Pick<Company, "subscriptionTier"> | SubscriptionTier) {
  const tier = typeof companyOrTier === "string" ? companyOrTier : companyOrTier.subscriptionTier;
  return PLAN_CONFIG[tier];
}

export async function getCompanyUsage(companyId: string): Promise<CompanyUsage> {
  const { start, end } = monthRange();
  const [vehicles, users, departments, activeBookings, monthlyTripLogs, monthlyDamageReports] =
    await Promise.all([
      prisma.vehicle.count({ where: { companyId, status: { not: "RETIRED" } } }),
      prisma.user.count({ where: { companyId, active: true } }),
      prisma.department.count({ where: { companyId } }),
      prisma.booking.count({
        where: {
          companyId,
          status: { in: [BookingStatus.PENDING, BookingStatus.APPROVED] }
        }
      }),
      prisma.tripLog.count({
        where: {
          companyId,
          createdAt: { gte: start, lt: end }
        }
      }),
      prisma.damageReport.count({
        where: {
          companyId,
          createdAt: { gte: start, lt: end }
        }
      })
    ]);

  return {
    vehicles,
    users,
    departments,
    activeBookings,
    monthlyTripLogs,
    monthlyDamageReports
  };
}

export function getLimitForMetric(plan: PlanConfig, metric: UsageMetric) {
  const key = {
    vehicles: "maxVehicles",
    users: "maxUsers",
    departments: "maxDepartments",
    activeBookings: "maxActiveBookings",
    monthlyTripLogs: "maxMonthlyTripLogs",
    monthlyDamageReports: "maxMonthlyDamageReports"
  }[metric] as keyof PlanConfig;

  return plan[key] as number;
}

export async function assertWithinPlan(companyId: string, metric: UsageMetric) {
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { subscriptionTier: true }
  });
  const usage = await getCompanyUsage(companyId);
  const plan = getPlan(company.subscriptionTier);
  const limit = getLimitForMetric(plan, metric);

  if (usage[metric] >= limit) {
    throw new Error("Planlimit erreicht. Bitte Plan erweitern oder bestehende Daten reduzieren.");
  }
}

export function assertFeatureAccess(plan: PlanConfig, feature: keyof Pick<PlanConfig, "analyticsAccess" | "csvExportAccess" | "customBrandingAccess" | "qrCodeAccess" | "maintenanceModuleAccess" | "driverPermissionAccess" | "costTrackingAccess" | "documentManagementAccess" | "complianceAccess">) {
  if (!plan[feature]) {
    throw new Error("Diese Funktion ist in Ihrem aktuellen Plan nicht enthalten.");
  }
}
