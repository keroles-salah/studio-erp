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
  }

  // Ensure standard 4 equipment exist with correct quantities
  try {
    const itemsToUpsert = [
      { code: 'SPK-001', name: 'سماعات', category: 'سماعات', quantity: 4, rentalPrice: 100 },
      { code: 'CAM-001', name: 'كاميرات', category: 'كاميرات', quantity: 3, rentalPrice: 250 },
      { code: 'OSM-001', name: 'أوزمو', category: 'مثبتات', quantity: 1, rentalPrice: 150 },
      { code: 'LGT-001', name: 'إضاءة استوديو', category: 'إضاءة', quantity: 2, rentalPrice: 120 },
    ];

    for (const item of itemsToUpsert) {
      const existing = await prisma.equipment.findFirst({
        where: {
          OR: [{ equipmentCode: item.code }, { name: item.name }],
          deletedAt: null,
        },
      });

      if (existing) {
        if (existing.quantity !== item.quantity) {
          await prisma.equipment.update({
            where: { id: existing.id },
            data: { quantity: item.quantity },
          });
        }
      } else {
        await prisma.equipment.create({
          data: {
            equipmentCode: item.code,
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            rentalPrice: item.rentalPrice,
            ownershipType: 'OWNED',
            status: 'AVAILABLE',
            location: 'غرفة المعدات الرئيسية',
          },
        });
      }
    }
  } catch (e) {
    console.warn('Equipment auto-seed error:', e);
  }

  dbMigrationDone = true;
}
