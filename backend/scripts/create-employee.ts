import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('👤 Creating/Updating Employee account with strong credentials...');

  const allPerms = await prisma.permission.findMany();

  // Employee operational permissions (create, update, view for bookings, customers, invoices, payments, equipment)
  const allowedPermNames = [
    'customers.view', 'customers.create', 'customers.update',
    'bookings.view', 'bookings.create', 'bookings.update',
    'invoices.view', 'invoices.create', 'invoices.update',
    'payments.view', 'payments.create',
    'equipment.view',
    'expenses.view', 'expenses.create',
    'leads.view', 'leads.create', 'leads.update',
  ];

  const employeePerms = allPerms.filter((p) => allowedPermNames.includes(p.name));

  const employeeRole = await prisma.role.upsert({
    where: { name: 'EMPLOYEE' },
    update: {
      description: 'موظف - صلاحيات العمليات التشغيلية اليومية',
      permissions: { set: employeePerms.map((p) => ({ id: p.id })) },
    },
    create: {
      name: 'EMPLOYEE',
      description: 'موظف - صلاحيات العمليات التشغيلية اليومية',
      permissions: { connect: employeePerms.map((p) => ({ id: p.id })) },
    },
  });

  const employeeEmail = 'employee@studio.com';
  const employeeRawPassword = 'Staff#2026!Studio@Vault$98';
  const passwordHash = await bcrypt.hash(employeeRawPassword, 10);

  const user = await prisma.user.upsert({
    where: { email: employeeEmail },
    update: {
      name: 'موظف الاستوديو',
      passwordHash,
      roleId: employeeRole.id,
      status: 'ACTIVE',
    },
    create: {
      name: 'موظف الاستوديو',
      email: employeeEmail,
      passwordHash,
      roleId: employeeRole.id,
      status: 'ACTIVE',
    },
  });

  console.log('✅ Employee account successfully created!');
  console.log('----------------------------------------------------');
  console.log(`Email:    ${employeeEmail}`);
  console.log(`Password: ${employeeRawPassword}`);
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('Error creating employee account:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
