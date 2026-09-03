import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

let dbMigrationDone = false;
export async function ensureDbSchema() {
  if (dbMigrationDone) return;
  try {
    // PostgreSQL: add quantity column if missing
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "equipment" ADD COLUMN IF NOT EXISTS "quantity" INTEGER NOT NULL DEFAULT 1;`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "booking_equipment" ADD COLUMN IF NOT EXISTS "quantity" INTEGER NOT NULL DEFAULT 1;`
    );
    dbMigrationDone = true;
  } catch (err) {
    try {
      // SQLite fallback (without IF NOT EXISTS)
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "equipment" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;`
      );
    } catch {}
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "booking_equipment" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;`
      );
    } catch {}
    dbMigrationDone = true;
  }
}
