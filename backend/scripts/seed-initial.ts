import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Adding Customer and 2 Equipment items...');

  // 1. Add Customer "كيرو صلاح"
  const existingCustomer = await prisma.customer.findFirst({ where: { fullName: 'كيرو صلاح' } });
  if (!existingCustomer) {
    const customer = await prisma.customer.create({
      data: {
        fullName: 'كيرو صلاح',
        phone: '0501234567',
        whatsapp: '0501234567',
        email: 'kero.salah@example.com',
        city: 'الرياض',
        address: 'حي العليا',
        customerStatus: 'ACTIVE',
        notes: 'عميل مميز',
      },
    });
    console.log(`✓ Added Customer: ${customer.fullName} (ID: ${customer.id})`);
  } else {
    console.log(`✓ Customer already exists: ${existingCustomer.fullName}`);
  }

  // 2. Add Equipment 1: Sony FX3 Cinema Camera
  const existingEq1 = await prisma.equipment.findFirst({ where: { equipmentCode: 'CAM-001' } });
  if (!existingEq1) {
    const eq1 = await prisma.equipment.create({
      data: {
        equipmentCode: 'CAM-001',
        name: 'Sony FX3 Cinema Camera',
        category: 'معدات',
        brand: 'Sony',
        model: 'FX3',
        ownershipType: 'OWNED',
        purchasePrice: 15000,
        rentalPrice: 500,
        status: 'AVAILABLE',
        location: 'استوديو 1 - الرف A',
        notes: 'كاميرا سينمائية بكامل ملحقاتها',
      },
    });
    console.log(`✓ Added Equipment 1: ${eq1.name} (${eq1.equipmentCode})`);
  }

  // 3. Add Equipment 2: DJI RS 4 Pro Gimbal
  const existingEq2 = await prisma.equipment.findFirst({ where: { equipmentCode: 'GMB-001' } });
  if (!existingEq2) {
    const eq2 = await prisma.equipment.create({
      data: {
        equipmentCode: 'GMB-001',
        name: 'DJI RS 4 Pro Gimbal',
        category: 'معدات',
        brand: 'DJI',
        model: 'RS 4 Pro',
        ownershipType: 'OWNED',
        purchasePrice: 4200,
        rentalPrice: 250,
        status: 'AVAILABLE',
        location: 'استوديو 1 - الرف B',
        notes: 'مثبت حركة احترافي مع محرك فوكس',
      },
    });
    console.log(`✓ Added Equipment 2: ${eq2.name} (${eq2.equipmentCode})`);
  }

  console.log('\n🎉 Finished adding customer and equipment!');
}

main()
  .catch((e) => {
    console.error('Error adding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
