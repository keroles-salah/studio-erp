-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_equipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "equipmentCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "ownershipType" TEXT NOT NULL DEFAULT 'OWNED',
    "purchasePrice" DECIMAL,
    "rentalCost" DECIMAL,
    "rentalPrice" DECIMAL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "location" TEXT,
    "notes" TEXT,
    "imageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);
INSERT INTO "new_equipment" ("brand", "category", "createdAt", "deletedAt", "equipmentCode", "id", "imageUrl", "location", "model", "name", "notes", "ownershipType", "purchasePrice", "rentalCost", "rentalPrice", "serialNumber", "status", "updatedAt") SELECT "brand", "category", "createdAt", "deletedAt", "equipmentCode", "id", "imageUrl", "location", "model", "name", "notes", "ownershipType", "purchasePrice", "rentalCost", "rentalPrice", "serialNumber", "status", "updatedAt" FROM "equipment";
DROP TABLE "equipment";
ALTER TABLE "new_equipment" RENAME TO "equipment";
CREATE UNIQUE INDEX "equipment_equipmentCode_key" ON "equipment"("equipmentCode");
CREATE INDEX "equipment_status_idx" ON "equipment"("status");
CREATE INDEX "equipment_category_idx" ON "equipment"("category");
CREATE INDEX "equipment_serialNumber_idx" ON "equipment"("serialNumber");
CREATE INDEX "equipment_ownershipType_idx" ON "equipment"("ownershipType");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
