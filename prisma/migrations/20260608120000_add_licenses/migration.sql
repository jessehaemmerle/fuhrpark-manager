-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "License" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "licenseKey" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "LicenseStatus" NOT NULL DEFAULT 'ACTIVE',
  "tier" "SubscriptionTier" NOT NULL,
  "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validUntil" TIMESTAMP(3) NOT NULL,
  "maxUsers" INTEGER,
  "maxVehicles" INTEGER,
  "notes" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "License_licenseKey_key" ON "License"("licenseKey");
CREATE INDEX "License_companyId_status_idx" ON "License"("companyId", "status");
CREATE INDEX "License_status_validUntil_idx" ON "License"("status", "validUntil");
CREATE INDEX "License_tier_idx" ON "License"("tier");

-- Foreign keys
ALTER TABLE "License" ADD CONSTRAINT "License_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "License" ADD CONSTRAINT "License_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
