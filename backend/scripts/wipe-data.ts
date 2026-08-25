import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Wiping all demo and transactional data from the database...');

  const tables = [
    'audit_logs',
    'notifications',
    'campaign_recipients',
    'marketing_campaigns',
    'expenses',
    'payments',
    'invoice_items',
    'invoices',
    'external_rentals',
    'booking_equipment',
    'booking_services',
    'events',
    'bookings',
    'communications',
    'customer_documents',
    'leads',
    'customers',
    'equipment',
    'services',
    'suppliers',
    'refresh_tokens',
  ];

  for (const table of tables) {
    try {
      await (prisma as any).$executeRawUnsafe(`DELETE FROM "${table}";`);
      console.log(`✓ Wiped table: ${table}`);
    } catch (err: any) {
      console.warn(`Could not wipe table ${table}:`, err.message);
    }
  }

  // Ensure Admin user is preserved/ready
  let superAdminRole = await prisma.role.findFirst({ where: { name: 'SUPER_ADMIN' } });
  if (!superAdminRole) {
    superAdminRole = await prisma.role.create({
      data: {
        name: 'SUPER_ADMIN',
        description: 'مدير النظام - كامل الصلاحيات',
      },
    });
  }

  let employeeRole = await prisma.role.findFirst({ where: { name: 'EMPLOYEE' } });
  if (!employeeRole) {
    employeeRole = await prisma.role.create({
      data: {
        name: 'EMPLOYEE',
        description: 'موظف - صلاحيات العمليات اليومية',
      },
    });
  }

  const passwordHash = await bcrypt.hash('Admin@123', 10);
  const adminEmail = 'admin@studio.com';

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        name: 'مدير النظام',
        email: adminEmail,
        passwordHash,
        roleId: superAdminRole.id,
        status: 'ACTIVE',
      },
    });
    console.log(`✓ Created default Admin user: ${adminEmail} / Admin@123`);
  } else {
    await prisma.user.update({
      where: { email: adminEmail },
      data: {
        name: 'مدير النظام',
        passwordHash,
        roleId: superAdminRole.id,
        status: 'ACTIVE',
      },
    });
    console.log(`✓ Admin user password verified: ${adminEmail} / Admin@123`);
  }

  // Delete other non-admin demo users if any
  await prisma.user.deleteMany({
    where: {
      email: {
        not: adminEmail,
      },
    },
  });

  console.log('\n🎉 Database successfully wiped clean! System is ready for fresh data.');
}

main()
  .catch((e) => {
    console.error('Error wiping database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
