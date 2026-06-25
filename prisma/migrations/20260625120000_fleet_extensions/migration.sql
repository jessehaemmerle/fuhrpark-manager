-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BOOKING_REQUESTED', 'BOOKING_APPROVED', 'BOOKING_REJECTED', 'BOOKING_OVERDUE', 'DAMAGE_REPORTED', 'MAINTENANCE_DUE', 'DEADLINE_DUE', 'LICENSE_EXPIRING', 'LICENSE_CHECK_DUE', 'INVITATION', 'GENERAL');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('REGISTRATION', 'INSURANCE', 'LEASING', 'INSPECTION', 'SERVICE_RECORD', 'OTHER');

-- CreateEnum
CREATE TYPE "DeadlineType" AS ENUM ('HU', 'AU', 'INSPECTION', 'INSURANCE', 'LEASING_END', 'TIRE_CHANGE', 'TAX', 'OTHER');

-- CreateEnum
CREATE TYPE "CostCategory" AS ENUM ('FUEL', 'CHARGING', 'MAINTENANCE', 'INSURANCE', 'LEASING', 'TAX', 'FINE', 'CLEANING', 'TOLL', 'OTHER');

-- CreateEnum
CREATE TYPE "LicenseCheckResult" AS ENUM ('VALID', 'INVALID', 'NOT_PRESENTED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "licenseCheckIntervalDays" INTEGER NOT NULL DEFAULT 180,
ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'de';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "nextLicenseCheckDue" TIMESTAMP(3),
ADD COLUMN     "notifyByEmail" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorRecoveryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "twoFactorSecret" TEXT;

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'GENERAL',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "url" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "readAt" TIMESTAMP(3),
    "emailedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleDocument" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL DEFAULT 'OTHER',
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "validUntil" TIMESTAMP(3),
    "notes" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleDeadline" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" "DeadlineType" NOT NULL,
    "title" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "dueMileage" INTEGER,
    "intervalDays" INTEGER,
    "intervalMileage" INTEGER,
    "reminderLeadDays" INTEGER NOT NULL DEFAULT 30,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "lastRemindedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleDeadline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostEntry" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "category" "CostCategory" NOT NULL DEFAULT 'OTHER',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "incurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vendor" TEXT,
    "note" TEXT,
    "liters" DECIMAL(8,2),
    "energyKwh" DECIMAL(8,2),
    "mileage" INTEGER,
    "pricePerUnit" DECIMAL(8,3),
    "tripLogId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicenseCheck" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checkedById" TEXT,
    "method" TEXT,
    "result" "LicenseCheckResult" NOT NULL DEFAULT 'VALID',
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextCheckDue" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LicenseCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "departmentId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" TEXT,
    "acceptedUserId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_companyId_userId_readAt_idx" ON "Notification"("companyId", "userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "VehicleDocument_companyId_vehicleId_idx" ON "VehicleDocument"("companyId", "vehicleId");

-- CreateIndex
CREATE INDEX "VehicleDocument_companyId_type_idx" ON "VehicleDocument"("companyId", "type");

-- CreateIndex
CREATE INDEX "VehicleDocument_validUntil_idx" ON "VehicleDocument"("validUntil");

-- CreateIndex
CREATE INDEX "VehicleDeadline_companyId_completed_dueDate_idx" ON "VehicleDeadline"("companyId", "completed", "dueDate");

-- CreateIndex
CREATE INDEX "VehicleDeadline_companyId_vehicleId_idx" ON "VehicleDeadline"("companyId", "vehicleId");

-- CreateIndex
CREATE INDEX "VehicleDeadline_dueDate_idx" ON "VehicleDeadline"("dueDate");

-- CreateIndex
CREATE INDEX "CostEntry_companyId_vehicleId_idx" ON "CostEntry"("companyId", "vehicleId");

-- CreateIndex
CREATE INDEX "CostEntry_companyId_category_idx" ON "CostEntry"("companyId", "category");

-- CreateIndex
CREATE INDEX "CostEntry_companyId_incurredAt_idx" ON "CostEntry"("companyId", "incurredAt");

-- CreateIndex
CREATE INDEX "LicenseCheck_companyId_userId_idx" ON "LicenseCheck"("companyId", "userId");

-- CreateIndex
CREATE INDEX "LicenseCheck_companyId_checkedAt_idx" ON "LicenseCheck"("companyId", "checkedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "Invitation_companyId_status_idx" ON "Invitation"("companyId", "status");

-- CreateIndex
CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");

-- CreateIndex
CREATE INDEX "Invitation_expiresAt_idx" ON "Invitation"("expiresAt");

-- CreateIndex
CREATE INDEX "User_nextLicenseCheckDue_idx" ON "User"("nextLicenseCheckDue");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDocument" ADD CONSTRAINT "VehicleDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDocument" ADD CONSTRAINT "VehicleDocument_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDeadline" ADD CONSTRAINT "VehicleDeadline_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDeadline" ADD CONSTRAINT "VehicleDeadline_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostEntry" ADD CONSTRAINT "CostEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostEntry" ADD CONSTRAINT "CostEntry_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseCheck" ADD CONSTRAINT "LicenseCheck_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseCheck" ADD CONSTRAINT "LicenseCheck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

┌─────────────────────────────────────────────────────────┐
│  Update available 5.22.0 -> 7.8.0                       │
│                                                         │
│  This is a major update - please follow the guide at    │
│  https://pris.ly/d/major-version-upgrade                │
│                                                         │
│  Run the following to update                            │
│    npm i --save-dev prisma@latest                       │
│    npm i @prisma/client@latest                          │
└─────────────────────────────────────────────────────────┘
