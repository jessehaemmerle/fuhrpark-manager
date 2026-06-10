ALTER TABLE "Company"
ADD COLUMN "isPlatformCompany" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Company"
SET "isPlatformCompany" = true
WHERE "slug" = 'fleetbase-operations';

CREATE INDEX "Company_isPlatformCompany_idx" ON "Company"("isPlatformCompany");
