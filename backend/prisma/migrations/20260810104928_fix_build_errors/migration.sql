-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_external_rentals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "equipmentName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "rentalCost" DECIMAL NOT NULL,
    "rentalStart" DATETIME NOT NULL,
    "rentalEnd" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "external_rentals_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "external_rentals_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_external_rentals" ("bookingId", "equipmentName", "id", "notes", "quantity", "rentalCost", "rentalEnd", "rentalStart", "status", "supplierId") SELECT "bookingId", "equipmentName", "id", "notes", "quantity", "rentalCost", "rentalEnd", "rentalStart", "status", "supplierId" FROM "external_rentals";
DROP TABLE "external_rentals";
ALTER TABLE "new_external_rentals" RENAME TO "external_rentals";
CREATE INDEX "external_rentals_supplierId_idx" ON "external_rentals"("supplierId");
CREATE INDEX "external_rentals_bookingId_idx" ON "external_rentals"("bookingId");
CREATE TABLE "new_services" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "basePrice" DECIMAL NOT NULL,
    "cost" DECIMAL NOT NULL DEFAULT 0,
    "taxRate" DECIMAL NOT NULL DEFAULT 15,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);
INSERT INTO "new_services" ("basePrice", "category", "cost", "createdAt", "description", "id", "name", "status", "taxRate", "updatedAt") SELECT "basePrice", "category", "cost", "createdAt", "description", "id", "name", "status", "taxRate", "updatedAt" FROM "services";
DROP TABLE "services";
ALTER TABLE "new_services" RENAME TO "services";
CREATE INDEX "services_category_idx" ON "services"("category");
CREATE INDEX "services_status_idx" ON "services"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
