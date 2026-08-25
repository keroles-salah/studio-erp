import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Updating EMPLOYEE role permissions...');

  const allPerms = await prisma.permission.findMany();

  // Employee operational permissions
  const employeePermNames = [
    'customers.view', 'customers.create', 'customers.update',
    'bookings.view', 'bookings.create', 'bookings.update',
    'invoices.view', 'invoices.create', 'invoices.update',
    'payments.view', 'payments.create',
    'equipment.view',
    'expenses.view', 'expenses.create',
    'leads.view', 'leads.create', 'leads.update',
    'settings.view',
    'reports.view',
  ];

  // Ensure all these permissions exist in the permissions table
  for (const pName of employeePermNames) {
    const [module, action] = pName.split('.');
    await prisma.permission.upsert({
      where: { name: pName },
      update: {},
      create: {
        name: pName,
        module,
        action,
      },
    });
  }

  const updatedPerms = await prisma.permission.findMany({
    where: { name: { in: employeePermNames } },
  });

  const employeeRole = await prisma.role.upsert({
    where: { name: 'EMPLOYEE' },
    update: {
      permissions: { set: updatedPerms.map((p) => ({ id: p.id })) },
    },
    create: {
      name: 'EMPLOYEE',
      description: 'موظف - صلاحيات العمليات التشغيلية والتقارير اليومية',
      permissions: { connect: updatedPerms.map((p) => ({ id: p.id })) },
    },
  });

  console.log(`✅ EMPLOYEE role updated with ${updatedPerms.length} permissions!`);
}

main()
  .catch((e) => {
    console.error('Error updating permissions:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
