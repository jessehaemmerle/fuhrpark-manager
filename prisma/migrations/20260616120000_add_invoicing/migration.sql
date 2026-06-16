-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'SENT', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceTaxMode" AS ENUM ('STANDARD', 'REVERSE_CHARGE');

-- AlterTable
ALTER TABLE "Company"
ADD COLUMN "vatId" TEXT,
ADD COLUMN "billingEmail" TEXT;

-- CreateTable
CREATE TABLE "Invoice" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "licenseId" TEXT,
  "invoiceNumber" TEXT,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "tier" "SubscriptionTier" NOT NULL,
  "taxMode" "InvoiceTaxMode" NOT NULL DEFAULT 'STANDARD',
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "issueDate" TIMESTAMP(3),
  "servicePeriodStart" TIMESTAMP(3) NOT NULL,
  "servicePeriodEnd" TIMESTAMP(3) NOT NULL,
  "dueDate" TIMESTAMP(3),
  "netAmountCents" INTEGER NOT NULL DEFAULT 0,
  "taxRatePercent" INTEGER NOT NULL DEFAULT 20,
  "taxAmountCents" INTEGER NOT NULL DEFAULT 0,
  "grossAmountCents" INTEGER NOT NULL DEFAULT 0,
  "lineItems" JSONB NOT NULL DEFAULT '[]',
  "sellerSnapshot" JSONB,
  "buyerSnapshot" JSONB,
  "notes" TEXT,
  "pdf" BYTEA,
  "sentAt" TIMESTAMP(3),
  "sentTo" TEXT,
  "paidAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformBillingSettings" (
  "id" TEXT NOT NULL DEFAULT 'platform',
  "legalName" TEXT NOT NULL DEFAULT '',
  "addressLine1" TEXT NOT NULL DEFAULT '',
  "addressLine2" TEXT,
  "postalCode" TEXT NOT NULL DEFAULT '',
  "city" TEXT NOT NULL DEFAULT '',
  "country" TEXT NOT NULL DEFAULT 'AT',
  "vatId" TEXT NOT NULL DEFAULT '',
  "registrationInfo" TEXT,
  "email" TEXT NOT NULL DEFAULT '',
  "phone" TEXT,
  "website" TEXT,
  "iban" TEXT,
  "bic" TEXT,
  "bankName" TEXT,
  "invoiceNumberPrefix" TEXT NOT NULL DEFAULT 'RE',
  "invoiceCounter" INTEGER NOT NULL DEFAULT 0,
  "taxRatePercent" INTEGER NOT NULL DEFAULT 20,
  "paymentTermsDays" INTEGER NOT NULL DEFAULT 14,
  "footerNote" TEXT,
  "reverseChargeNote" TEXT NOT NULL DEFAULT 'Steuerschuldnerschaft des Leistungsempfängers (Reverse Charge gemäß Art. 196 MwSt-SystRL).',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformBillingSettings_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE INDEX "Invoice_companyId_status_idx" ON "Invoice"("companyId", "status");
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");
CREATE INDEX "Invoice_invoiceNumber_idx" ON "Invoice"("invoiceNumber");
CREATE INDEX "Invoice_createdAt_idx" ON "Invoice"("createdAt");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
