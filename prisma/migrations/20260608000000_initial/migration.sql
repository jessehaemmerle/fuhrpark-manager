-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'FLEET_MANAGER', 'USER', 'PLATFORM_ADMIN');
CREATE TYPE "SubscriptionTier" AS ENUM ('TRIAL', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE');
CREATE TYPE "VehicleCategory" AS ENUM ('SEDAN', 'SUV', 'TRUCK', 'VAN', 'HATCHBACK', 'COUPE', 'OTHER');
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'DOWNTIME', 'MAINTENANCE', 'RETIRED');
CREATE TYPE "FuelType" AS ENUM ('GASOLINE', 'DIESEL', 'HYBRID', 'ELECTRIC', 'HYDROGEN', 'OTHER');
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED');
CREATE TYPE "MaintenanceStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "MaintenanceType" AS ENUM ('INSPECTION', 'REPAIR', 'TIRE_CHANGE', 'SERVICE', 'CLEANING', 'OTHER');
CREATE TYPE "TripType" AS ENUM ('BUSINESS', 'PRIVATE', 'COMMUTE', 'OTHER');
CREATE TYPE "DamageSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "DamageStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'SCHEDULED_FOR_REPAIR', 'RESOLVED', 'REJECTED');
CREATE TYPE "HandoverType" AS ENUM ('HANDOVER', 'RETURN');

-- CreateTable
CREATE TABLE "Company" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "logoUrl" TEXT,
  "primaryBrandColor" TEXT NOT NULL DEFAULT '#0f766e',
  "address" TEXT,
  "country" TEXT NOT NULL DEFAULT 'DE',
  "contactEmail" TEXT NOT NULL,
  "contactPhone" TEXT,
  "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'TRIAL',
  "trialStartDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "trialEndDate" TIMESTAMP(3) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "retentionPeriodDays" INTEGER NOT NULL DEFAULT 3650,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "departmentId" TEXT,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'USER',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "licenseNumber" TEXT,
  "licenseClass" TEXT,
  "licenseValidUntil" TIMESTAMP(3),
  "lastLicenseCheckDate" TIMESTAMP(3),
  "driverApproved" BOOLEAN NOT NULL DEFAULT false,
  "driverBlocked" BOOLEAN NOT NULL DEFAULT false,
  "driverNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Department" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "managerName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Vehicle" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "internalNumber" TEXT NOT NULL,
  "licensePlate" TEXT NOT NULL,
  "brand" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "year" INTEGER,
  "vin" TEXT,
  "category" "VehicleCategory" NOT NULL,
  "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
  "fuelType" "FuelType" NOT NULL DEFAULT 'DIESEL',
  "mileage" INTEGER NOT NULL DEFAULT 0,
  "location" TEXT,
  "notes" TEXT,
  "imageUrl" TEXT,
  "qrCodeToken" TEXT,
  "qrCodeEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Booking" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "purpose" TEXT NOT NULL,
  "destination" TEXT,
  "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
  "approvalNote" TEXT,
  "rejectionNote" TEXT,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectedById" TEXT,
  "rejectedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MaintenanceRecord" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" "MaintenanceType" NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "vendor" TEXT,
  "status" "MaintenanceStatus" NOT NULL DEFAULT 'PLANNED',
  "damageReportId" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MaintenanceRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TripLog" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "bookingId" TEXT,
  "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endAt" TIMESTAMP(3),
  "startMileage" INTEGER NOT NULL,
  "endMileage" INTEGER,
  "distance" INTEGER,
  "startLocation" TEXT,
  "destination" TEXT,
  "purpose" TEXT NOT NULL,
  "tripType" "TripType" NOT NULL DEFAULT 'BUSINESS',
  "notes" TEXT,
  "correctionNote" TEXT,
  "locked" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TripLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DamageReport" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "reporterUserId" TEXT NOT NULL,
  "bookingId" TEXT,
  "tripLogId" TEXT,
  "handoverId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "damageLocation" TEXT,
  "severity" "DamageSeverity" NOT NULL DEFAULT 'LOW',
  "status" "DamageStatus" NOT NULL DEFAULT 'OPEN',
  "photoUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "repairCost" DECIMAL(10,2),
  "resolvedById" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DamageReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VehicleHandover" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "bookingId" TEXT,
  "userId" TEXT NOT NULL,
  "type" "HandoverType" NOT NULL,
  "handledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "mileage" INTEGER NOT NULL,
  "energyLevel" INTEGER,
  "exteriorConditionNote" TEXT,
  "interiorConditionNote" TEXT,
  "existingDamageConfirmed" BOOLEAN NOT NULL DEFAULT false,
  "newDamageReported" BOOLEAN NOT NULL DEFAULT false,
  "signatureName" TEXT,
  "photoUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VehicleHandover_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UsageSnapshot" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "month" TIMESTAMP(3) NOT NULL,
  "subscriptionTier" "SubscriptionTier" NOT NULL,
  "vehicles" INTEGER NOT NULL,
  "users" INTEGER NOT NULL,
  "departments" INTEGER NOT NULL,
  "activeBookings" INTEGER NOT NULL,
  "monthlyTripLogs" INTEGER NOT NULL,
  "monthlyDamageReports" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UsageSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SubscriptionPlanConfig" (
  "id" TEXT NOT NULL,
  "tier" "SubscriptionTier" NOT NULL,
  "maxVehicles" INTEGER NOT NULL,
  "maxUsers" INTEGER NOT NULL,
  "maxDepartments" INTEGER NOT NULL,
  "maxActiveBookings" INTEGER NOT NULL,
  "maxMonthlyTripLogs" INTEGER NOT NULL,
  "maxMonthlyDamageReports" INTEGER NOT NULL,
  "analyticsAccess" BOOLEAN NOT NULL,
  "csvExportAccess" BOOLEAN NOT NULL,
  "customBrandingAccess" BOOLEAN NOT NULL,
  "qrCodeAccess" BOOLEAN NOT NULL,
  "maintenanceModuleAccess" BOOLEAN NOT NULL,
  "driverPermissionAccess" BOOLEAN NOT NULL,
  "prioritySupport" BOOLEAN NOT NULL,
  "monthlyPriceCents" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SubscriptionPlanConfig_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");
CREATE INDEX "Company_subscriptionTier_idx" ON "Company"("subscriptionTier");
CREATE INDEX "Company_active_idx" ON "Company"("active");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_companyId_role_idx" ON "User"("companyId", "role");
CREATE INDEX "User_companyId_active_idx" ON "User"("companyId", "active");
CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");
CREATE UNIQUE INDEX "Department_companyId_name_key" ON "Department"("companyId", "name");
CREATE INDEX "Department_companyId_idx" ON "Department"("companyId");
CREATE UNIQUE INDEX "Vehicle_qrCodeToken_key" ON "Vehicle"("qrCodeToken");
CREATE UNIQUE INDEX "Vehicle_companyId_internalNumber_key" ON "Vehicle"("companyId", "internalNumber");
CREATE UNIQUE INDEX "Vehicle_companyId_licensePlate_key" ON "Vehicle"("companyId", "licensePlate");
CREATE INDEX "Vehicle_companyId_status_idx" ON "Vehicle"("companyId", "status");
CREATE INDEX "Vehicle_companyId_category_idx" ON "Vehicle"("companyId", "category");
CREATE INDEX "Booking_companyId_status_idx" ON "Booking"("companyId", "status");
CREATE INDEX "Booking_companyId_vehicleId_startAt_endAt_idx" ON "Booking"("companyId", "vehicleId", "startAt", "endAt");
CREATE INDEX "Booking_companyId_userId_idx" ON "Booking"("companyId", "userId");
CREATE INDEX "MaintenanceRecord_companyId_status_idx" ON "MaintenanceRecord"("companyId", "status");
CREATE INDEX "MaintenanceRecord_companyId_vehicleId_startAt_endAt_idx" ON "MaintenanceRecord"("companyId", "vehicleId", "startAt", "endAt");
CREATE INDEX "TripLog_companyId_vehicleId_idx" ON "TripLog"("companyId", "vehicleId");
CREATE INDEX "TripLog_companyId_userId_idx" ON "TripLog"("companyId", "userId");
CREATE INDEX "TripLog_companyId_startAt_idx" ON "TripLog"("companyId", "startAt");
CREATE INDEX "DamageReport_companyId_status_idx" ON "DamageReport"("companyId", "status");
CREATE INDEX "DamageReport_companyId_severity_idx" ON "DamageReport"("companyId", "severity");
CREATE INDEX "DamageReport_companyId_vehicleId_idx" ON "DamageReport"("companyId", "vehicleId");
CREATE INDEX "VehicleHandover_companyId_type_idx" ON "VehicleHandover"("companyId", "type");
CREATE INDEX "VehicleHandover_companyId_vehicleId_idx" ON "VehicleHandover"("companyId", "vehicleId");
CREATE INDEX "AuditLog_companyId_action_idx" ON "AuditLog"("companyId", "action");
CREATE INDEX "AuditLog_companyId_entityType_entityId_idx" ON "AuditLog"("companyId", "entityType", "entityId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE UNIQUE INDEX "UsageSnapshot_companyId_month_key" ON "UsageSnapshot"("companyId", "month");
CREATE INDEX "UsageSnapshot_companyId_idx" ON "UsageSnapshot"("companyId");
CREATE UNIQUE INDEX "SubscriptionPlanConfig_tier_key" ON "SubscriptionPlanConfig"("tier");

-- Foreign keys
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Department" ADD CONSTRAINT "Department_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_damageReportId_fkey" FOREIGN KEY ("damageReportId") REFERENCES "DamageReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripLog" ADD CONSTRAINT "TripLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripLog" ADD CONSTRAINT "TripLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripLog" ADD CONSTRAINT "TripLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripLog" ADD CONSTRAINT "TripLog_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DamageReport" ADD CONSTRAINT "DamageReport_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DamageReport" ADD CONSTRAINT "DamageReport_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DamageReport" ADD CONSTRAINT "DamageReport_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DamageReport" ADD CONSTRAINT "DamageReport_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DamageReport" ADD CONSTRAINT "DamageReport_tripLogId_fkey" FOREIGN KEY ("tripLogId") REFERENCES "TripLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DamageReport" ADD CONSTRAINT "DamageReport_handoverId_fkey" FOREIGN KEY ("handoverId") REFERENCES "VehicleHandover"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DamageReport" ADD CONSTRAINT "DamageReport_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VehicleHandover" ADD CONSTRAINT "VehicleHandover_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleHandover" ADD CONSTRAINT "VehicleHandover_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleHandover" ADD CONSTRAINT "VehicleHandover_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VehicleHandover" ADD CONSTRAINT "VehicleHandover_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UsageSnapshot" ADD CONSTRAINT "UsageSnapshot_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
