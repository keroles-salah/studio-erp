-- AlterTable
ALTER TABLE "expenses" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "external_rentals" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN "deletedAt" DATETIME;

-- CreateIndex
CREATE INDEX "expenses_deletedAt_idx" ON "expenses"("deletedAt");

-- CreateIndex
CREATE INDEX "external_rentals_deletedAt_idx" ON "external_rentals"("deletedAt");

-- CreateIndex
CREATE INDEX "leads_deletedAt_idx" ON "leads"("deletedAt");
