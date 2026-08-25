/**
 * Studio ERP — Comprehensive Test Data Seeder
 *
 * Usage:
 *   npx prisma db seed -- --fresh   # wipe + reseed
 *   npx prisma db seed              # upsert (idempotent)
 *
 * Run from backend/ directory.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── helpers ───────────────────────────────────────────────

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function hoursOnDate(date: Date, hour: number, min = 0): Date {
  const d = new Date(date);
  d.setHours(hour, min, 0, 0);
  return d;
}

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── main ──────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding comprehensive test data...\n');

  const fresh = process.argv.includes('--fresh');

  if (fresh) {
    console.log('⚠️  --fresh mode: wiping all data...\n');
    const order = [
      'audit_logs', 'notifications', 'campaign_recipients', 'marketing_campaigns',
      'expenses', 'payments', 'invoice_items', 'invoices',
      'external_rentals', 'booking_equipment', 'booking_services',
      'events', 'bookings', 'communications', 'customer_documents',
      'leads', 'customers', 'equipment', 'services', 'suppliers',
      '_PermissionToRole', 'permissions', 'users', 'roles', 'settings',
    ];
    for (const table of order) {
      await (prisma as any).$executeRawUnsafe(`DELETE FROM "${table}";`);
    }
    // Reset autoincrement sequences (SQLite if applicable)
    try {
      await (prisma as any).$executeRawUnsafe(`DELETE FROM sqlite_sequence;`);
    } catch {
      // Ignored on engines that do not have sqlite_sequence table (e.g. PostgreSQL)
    }
    console.log('✅ All tables wiped.\n');
  }

  // ═══════════════════════════════════════════════════════════
  // 1. PERMISSIONS
  // ═══════════════════════════════════════════════════════════
  console.log('📋 Creating permissions...');

  const permissionDefs = [
    // Customers
    { name: 'customers.view', module: 'customers', action: 'view' },
    { name: 'customers.create', module: 'customers', action: 'create' },
    { name: 'customers.update', module: 'customers', action: 'update' },
    { name: 'customers.delete', module: 'customers', action: 'delete' },
    // Leads
    { name: 'leads.view', module: 'leads', action: 'view' },
    { name: 'leads.create', module: 'leads', action: 'create' },
    { name: 'leads.update', module: 'leads', action: 'update' },
    { name: 'leads.delete', module: 'leads', action: 'delete' },
    // Bookings
    { name: 'bookings.view', module: 'bookings', action: 'view' },
    { name: 'bookings.create', module: 'bookings', action: 'create' },
    { name: 'bookings.update', module: 'bookings', action: 'update' },
    { name: 'bookings.delete', module: 'bookings', action: 'delete' },
    // Invoices
    { name: 'invoices.view', module: 'invoices', action: 'view' },
    { name: 'invoices.create', module: 'invoices', action: 'create' },
    { name: 'invoices.update', module: 'invoices', action: 'update' },
    { name: 'invoices.delete', module: 'invoices', action: 'delete' },
    // Payments
    { name: 'payments.view', module: 'payments', action: 'view' },
    { name: 'payments.create', module: 'payments', action: 'create' },
    { name: 'payments.delete', module: 'payments', action: 'delete' },
    // Equipment
    { name: 'equipment.view', module: 'equipment', action: 'view' },
    { name: 'equipment.create', module: 'equipment', action: 'create' },
    { name: 'equipment.update', module: 'equipment', action: 'update' },
    { name: 'equipment.delete', module: 'equipment', action: 'delete' },
    // Suppliers
    { name: 'suppliers.view', module: 'suppliers', action: 'view' },
    { name: 'suppliers.create', module: 'suppliers', action: 'create' },
    { name: 'suppliers.update', module: 'suppliers', action: 'update' },
    { name: 'suppliers.delete', module: 'suppliers', action: 'delete' },
    // Expenses
    { name: 'expenses.view', module: 'expenses', action: 'view' },
    { name: 'expenses.create', module: 'expenses', action: 'create' },
    { name: 'expenses.update', module: 'expenses', action: 'update' },
    { name: 'expenses.delete', module: 'expenses', action: 'delete' },
    // Reports
    { name: 'reports.view', module: 'reports', action: 'view' },
    // Marketing
    { name: 'marketing.view', module: 'marketing', action: 'view' },
    { name: 'marketing.create', module: 'marketing', action: 'create' },
    { name: 'marketing.send', module: 'marketing', action: 'send' },
    // Users
    { name: 'users.view', module: 'users', action: 'view' },
    { name: 'users.create', module: 'users', action: 'create' },
    { name: 'users.update', module: 'users', action: 'update' },
    { name: 'users.delete', module: 'users', action: 'delete' },
    // Settings
    { name: 'settings.view', module: 'settings', action: 'view' },
    { name: 'settings.update', module: 'settings', action: 'update' },
    // Audit
    { name: 'audit.view', module: 'audit', action: 'view' },
    // Services
    { name: 'services.view', module: 'services', action: 'view' },
    { name: 'services.create', module: 'services', action: 'create' },
    { name: 'services.update', module: 'services', action: 'update' },
    { name: 'services.delete', module: 'services', action: 'delete' },
    // Roles
    { name: 'roles.view', module: 'roles', action: 'view' },
    { name: 'roles.create', module: 'roles', action: 'create' },
    { name: 'roles.update', module: 'roles', action: 'update' },
    { name: 'roles.delete', module: 'roles', action: 'delete' },
  ];

  for (const perm of permissionDefs) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }

  const allPerms = await prisma.permission.findMany();
  console.log(`   ✓ ${allPerms.length} permissions`);

  // ═══════════════════════════════════════════════════════════
  // 2. ROLES
  // ═══════════════════════════════════════════════════════════
  console.log('👥 Creating roles...');

  const superAdminRole = await prisma.role.upsert({
    where: { name: 'SUPER_ADMIN' },
    update: { permissions: { set: allPerms.map(p => ({ id: p.id })) } },
    create: {
      name: 'SUPER_ADMIN',
      description: 'Full system access — all modules and actions',
      permissions: { connect: allPerms.map(p => ({ id: p.id })) },
    },
  });

  const adminPerms = allPerms.filter(p => !p.name.startsWith('users.') || p.name === 'users.view');
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: { permissions: { set: adminPerms.map(p => ({ id: p.id })) } },
    create: {
      name: 'ADMIN',
      description: 'Administrator — everything except user management',
      permissions: { connect: adminPerms.map(p => ({ id: p.id })) },
    },
  });

  const managerPerms = allPerms.filter(p =>
    ['customers.', 'leads.', 'bookings.', 'invoices.', 'payments.', 'equipment.', 'suppliers.', 'expenses.', 'reports.', 'marketing.'].some(m => p.name.startsWith(m))
  );
  const managerRole = await prisma.role.upsert({
    where: { name: 'MANAGER' },
    update: { permissions: { set: managerPerms.map(p => ({ id: p.id })) } },
    create: {
      name: 'MANAGER',
      description: 'Manager — operations, bookings, customers, finances',
      permissions: { connect: managerPerms.map(p => ({ id: p.id })) },
    },
  });

  const accountantPerms = allPerms.filter(p =>
    ['invoices.', 'payments.', 'expenses.', 'reports.'].some(m => p.name.startsWith(m))
  );
  const accountantRole = await prisma.role.upsert({
    where: { name: 'ACCOUNTANT' },
    update: { permissions: { set: accountantPerms.map(p => ({ id: p.id })) } },
    create: {
      name: 'ACCOUNTANT',
      description: 'Accountant — invoices, payments, expenses, reports',
      permissions: { connect: accountantPerms.map(p => ({ id: p.id })) },
    },
  });

  const employeePerms = allPerms.filter(p => p.name.endsWith('.view') && !p.name.startsWith('audit') && !p.name.startsWith('settings'));
  const employeeRole = await prisma.role.upsert({
    where: { name: 'EMPLOYEE' },
    update: { permissions: { set: employeePerms.map(p => ({ id: p.id })) } },
    create: {
      name: 'EMPLOYEE',
      description: 'Employee — read-only access to operational modules',
      permissions: { connect: employeePerms.map(p => ({ id: p.id })) },
    },
  });

  const viewerPerms = allPerms.filter(p => p.name.endsWith('.view'));
  const viewerRole = await prisma.role.upsert({
    where: { name: 'VIEWER' },
    update: { permissions: { set: viewerPerms.map(p => ({ id: p.id })) } },
    create: {
      name: 'VIEWER',
      description: 'Viewer — read-only across the system',
      permissions: { connect: viewerPerms.map(p => ({ id: p.id })) },
    },
  });

  console.log(`   ✓ 6 roles`);

  // ═══════════════════════════════════════════════════════════
  // 3. USERS
  // ═══════════════════════════════════════════════════════════
  console.log('🔐 Creating users...');

  const usersData = [
    { name: 'Studio Admin', email: 'admin@studio.com', phone: '+966500000000', password: 'Admin@123', role: 'SUPER_ADMIN' },
    { name: 'Ahmed Manager', email: 'manager@studio.com', phone: '+966500000001', password: 'Manager@123', role: 'MANAGER' },
    { name: 'Sara Accountant', email: 'sara@studio.com', phone: '+966500000002', password: 'Sara@123', role: 'ACCOUNTANT' },
    { name: 'Khalid Employee', email: 'khalid@studio.com', phone: '+966500000003', password: 'Khalid@123', role: 'EMPLOYEE' },
    { name: 'Nora Viewer', email: 'nora@studio.com', phone: '+966500000004', password: 'Nora@123', role: 'VIEWER' },
    { name: 'Omar Admin2', email: 'omar@studio.com', phone: '+966500000005', password: 'Omar@123', role: 'ADMIN' },
  ];

  const userMap: Record<string, string> = {};

  for (const u of usersData) {
    const role = await prisma.role.findUnique({ where: { name: u.role } });
    if (!role) continue;
    const passwordHash = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        phone: u.phone,
        passwordHash,
        roleId: role.id,
        status: 'ACTIVE',
      },
    });
    userMap[u.email] = user.id;
  }

  console.log(`   ✓ ${usersData.length} users`);
  console.log('   👤 admin@studio.com / Admin@123');
  console.log('   👤 manager@studio.com / Manager@123');
  console.log('   👤 sara@studio.com / Sara@123');
  console.log('   👤 khalid@studio.com / Khalid@123');
  console.log('   👤 nora@studio.com / Nora@123');
  console.log('   👤 omar@studio.com / Omar@123\n');

  // ═══════════════════════════════════════════════════════════
  // 4. SERVICES
  // ═══════════════════════════════════════════════════════════
  console.log('📦 Creating services...');

  const servicesData = [
    { name: 'Wedding Photography', description: 'Full wedding day photography coverage with 2 photographers', category: 'Photography', basePrice: 5000, cost: 500, taxRate: 15, status: 'ACTIVE' },
    { name: 'Wedding Videography', description: 'Cinematic wedding film + highlight reel', category: 'Videography', basePrice: 7000, cost: 800, taxRate: 15, status: 'ACTIVE' },
    { name: 'Engagement Photography', description: 'Pre-wedding engagement photo session', category: 'Photography', basePrice: 2000, cost: 200, taxRate: 15, status: 'ACTIVE' },
    { name: 'Studio Photography', description: 'In-studio portrait session (1 hour)', category: 'Photography', basePrice: 800, cost: 100, taxRate: 15, status: 'ACTIVE' },
    { name: 'Event Photography', description: 'Corporate or private event photography', category: 'Photography', basePrice: 2000, cost: 200, taxRate: 15, status: 'ACTIVE' },
    { name: 'Event Videography', description: 'Corporate or private event video coverage', category: 'Videography', basePrice: 3000, cost: 300, taxRate: 15, status: 'ACTIVE' },
    { name: 'Audio / Sound System', description: 'Professional sound system setup and operation', category: 'Audio', basePrice: 1500, cost: 200, taxRate: 15, status: 'ACTIVE' },
    { name: 'Lighting Setup', description: 'Professional event lighting design and setup', category: 'Lighting', basePrice: 1200, cost: 150, taxRate: 15, status: 'ACTIVE' },
    { name: 'Equipment Rental', description: 'Camera, lens, and gear rental (per day)', category: 'Rental', basePrice: 500, cost: 50, taxRate: 15, status: 'ACTIVE' },
    { name: 'Video Editing', description: 'Professional post-production video editing', category: 'Editing', basePrice: 1500, cost: 100, taxRate: 15, status: 'ACTIVE' },
    { name: 'Photo Retouching', description: 'Professional photo editing and retouching (per 50 photos)', category: 'Editing', basePrice: 600, cost: 50, taxRate: 15, status: 'ACTIVE' },
    { name: 'Drone Coverage', description: 'Aerial photography and videography with drone', category: 'Videography', basePrice: 2500, cost: 300, taxRate: 15, status: 'ACTIVE' },
    { name: 'Live Streaming', description: 'Live event streaming to social media platforms', category: 'Videography', basePrice: 3500, cost: 400, taxRate: 15, status: 'ACTIVE' },
    { name: 'Print Services', description: 'Photo printing and album creation', category: 'Print', basePrice: 1000, cost: 200, taxRate: 15, status: 'ACTIVE' },
    { name: 'Engagement Session', description: 'Pre-wedding engagement photo session (2 hours)', category: 'Photography', basePrice: 1500, cost: 200, taxRate: 15, status: 'ACTIVE' },
    { name: 'Drone Aerial Coverage', description: 'Aerial drone videography for events (per hour)', category: 'Videography', basePrice: 900, cost: 150, taxRate: 15, status: 'ACTIVE' },
  ];

  const serviceMap: Record<string, string> = {};

  for (const svc of servicesData) {
    const existing = await prisma.service.findFirst({ where: { name: svc.name } });
    if (existing) {
      serviceMap[svc.name] = existing.id;
    } else {
      const created = await prisma.service.create({ data: svc });
      serviceMap[svc.name] = created.id;
    }
  }

  console.log(`   ✓ ${servicesData.length} services`);

  // ═══════════════════════════════════════════════════════════
  // 5. EQUIPMENT
  // ═══════════════════════════════════════════════════════════
  console.log('📷 Creating equipment...');

  const equipmentData = [
    { equipmentCode: 'CAM-001', name: 'Canon EOS R5', category: 'Cameras', brand: 'Canon', model: 'EOS R5', serialNumber: 'SN-CAM-001', ownershipType: 'OWNED', purchasePrice: 15000, rentalPrice: 500, status: 'AVAILABLE', location: 'Studio A' },
    { equipmentCode: 'CAM-002', name: 'Sony A7 IV', category: 'Cameras', brand: 'Sony', model: 'A7 IV', serialNumber: 'SN-CAM-002', ownershipType: 'OWNED', purchasePrice: 12000, rentalPrice: 450, status: 'AVAILABLE', location: 'Studio A' },
    { equipmentCode: 'CAM-003', name: 'Nikon Z6 II', category: 'Cameras', brand: 'Nikon', model: 'Z6 II', serialNumber: 'SN-CAM-003', ownershipType: 'OWNED', purchasePrice: 10000, rentalPrice: 400, status: 'AVAILABLE', location: 'Studio A' },
    { equipmentCode: 'CAM-004', name: 'Canon EOS R6 Mark II', category: 'Cameras', brand: 'Canon', model: 'EOS R6 M2', serialNumber: 'SN-CAM-004', ownershipType: 'OWNED', purchasePrice: 13000, rentalPrice: 480, status: 'AVAILABLE', location: 'Studio A' },
    { equipmentCode: 'LEN-001', name: 'Canon RF 24-70mm f/2.8L', category: 'Lenses', brand: 'Canon', model: 'RF 24-70', serialNumber: 'SN-LEN-001', ownershipType: 'OWNED', purchasePrice: 8000, rentalPrice: 300, status: 'AVAILABLE', location: 'Studio A' },
    { equipmentCode: 'LEN-002', name: 'Canon RF 70-200mm f/2.8L', category: 'Lenses', brand: 'Canon', model: 'RF 70-200', serialNumber: 'SN-LEN-002', ownershipType: 'OWNED', purchasePrice: 9000, rentalPrice: 350, status: 'AVAILABLE', location: 'Studio A' },
    { equipmentCode: 'LEN-003', name: 'Sony 35mm f/1.4 GM', category: 'Lenses', brand: 'Sony', model: '35mm GM', serialNumber: 'SN-LEN-003', ownershipType: 'OWNED', purchasePrice: 6500, rentalPrice: 250, status: 'AVAILABLE', location: 'Studio A' },
    { equipmentCode: 'LEN-004', name: 'Canon RF 50mm f/1.2L', category: 'Lenses', brand: 'Canon', model: 'RF 50mm', serialNumber: 'SN-LEN-004', ownershipType: 'OWNED', purchasePrice: 7000, rentalPrice: 280, status: 'AVAILABLE', location: 'Studio A' },
    { equipmentCode: 'MIC-001', name: 'Rode Wireless GO II', category: 'Microphones', brand: 'Rode', model: 'Wireless GO II', serialNumber: 'SN-MIC-001', ownershipType: 'OWNED', purchasePrice: 1500, rentalPrice: 100, status: 'AVAILABLE', location: 'Studio B' },
    { equipmentCode: 'MIC-002', name: 'Shure SM7B', category: 'Microphones', brand: 'Shure', model: 'SM7B', serialNumber: 'SN-MIC-002', ownershipType: 'OWNED', purchasePrice: 2000, rentalPrice: 120, status: 'AVAILABLE', location: 'Studio B' },
    { equipmentCode: 'SPK-001', name: 'JBL EON 715 Speaker', category: 'Speakers', brand: 'JBL', model: 'EON 715', serialNumber: 'SN-SPK-001', ownershipType: 'OWNED', purchasePrice: 3000, rentalPrice: 250, status: 'AVAILABLE', location: 'Storage Room' },
    { equipmentCode: 'SPK-002', name: 'JBL EON 715 Speaker', category: 'Speakers', brand: 'JBL', model: 'EON 715', serialNumber: 'SN-SPK-002', ownershipType: 'OWNED', purchasePrice: 3000, rentalPrice: 250, status: 'AVAILABLE', location: 'Storage Room' },
    { equipmentCode: 'SPK-003', name: 'QSC K12.2 Speaker', category: 'Speakers', brand: 'QSC', model: 'K12.2', serialNumber: 'SN-SPK-003', ownershipType: 'OWNED', purchasePrice: 3500, rentalPrice: 300, status: 'AVAILABLE', location: 'Storage Room' },
    { equipmentCode: 'LGT-001', name: 'Godox SL-150W II', category: 'Lighting', brand: 'Godox', model: 'SL-150W II', serialNumber: 'SN-LGT-001', ownershipType: 'OWNED', purchasePrice: 2000, rentalPrice: 150, status: 'AVAILABLE', location: 'Studio B' },
    { equipmentCode: 'LGT-002', name: 'Aputure 300D II', category: 'Lighting', brand: 'Aputure', model: '300D II', serialNumber: 'SN-LGT-002', ownershipType: 'OWNED', purchasePrice: 5000, rentalPrice: 300, status: 'AVAILABLE', location: 'Studio B' },
    { equipmentCode: 'LGT-003', name: 'Aputure MC Pro', category: 'Lighting', brand: 'Aputure', model: 'MC Pro', serialNumber: 'SN-LGT-003', ownershipType: 'OWNED', purchasePrice: 1500, rentalPrice: 100, status: 'AVAILABLE', location: 'Studio B' },
    { equipmentCode: 'TRI-001', name: 'Manfrotto MT055CXPRO3', category: 'Tripods', brand: 'Manfrotto', model: 'MT055CXPRO3', serialNumber: 'SN-TRI-001', ownershipType: 'OWNED', purchasePrice: 800, rentalPrice: 50, status: 'AVAILABLE', location: 'Storage Room' },
    { equipmentCode: 'TRI-002', name: 'Peak Design Travel Tripod', category: 'Tripods', brand: 'Peak Design', model: 'Travel', serialNumber: 'SN-TRI-002', ownershipType: 'OWNED', purchasePrice: 650, rentalPrice: 40, status: 'AVAILABLE', location: 'Storage Room' },
    { equipmentCode: 'MIX-001', name: 'Yamaha MG16XU Mixer', category: 'Audio Mixers', brand: 'Yamaha', model: 'MG16XU', serialNumber: 'SN-MIX-001', ownershipType: 'OWNED', purchasePrice: 2500, rentalPrice: 200, status: 'AVAILABLE', location: 'Storage Room' },
    { equipmentCode: 'DRN-001', name: 'DJI Mavic 3 Pro', category: 'Drones', brand: 'DJI', model: 'Mavic 3 Pro', serialNumber: 'SN-DRN-001', ownershipType: 'OWNED', purchasePrice: 8000, rentalPrice: 400, status: 'AVAILABLE', location: 'Storage Room' },
    { equipmentCode: 'GMB-001', name: 'Zhiyun Crane 3S Gimbal', category: 'Gimbals', brand: 'Zhiyun', model: 'Crane 3S', serialNumber: 'SN-GMB-001', ownershipType: 'OWNED', purchasePrice: 1800, rentalPrice: 120, status: 'AVAILABLE', location: 'Studio B' },
    { equipmentCode: 'CAM-005', name: 'Sony A7R V', category: 'Cameras', brand: 'Sony', model: 'A7R V', serialNumber: 'SN-CAM-005', ownershipType: 'OWNED', purchasePrice: 14000, rentalPrice: 550, status: 'AVAILABLE', location: 'Studio A' },
    { equipmentCode: 'CAM-006', name: 'Fujifilm X-H2S', category: 'Cameras', brand: 'Fujifilm', model: 'X-H2S', serialNumber: 'SN-CAM-006', ownershipType: 'OWNED', purchasePrice: 9000, rentalPrice: 380, status: 'AVAILABLE', location: 'Studio A' },
    { equipmentCode: 'LEN-005', name: 'Sony 24-70mm f/2.8 GM II', category: 'Lenses', brand: 'Sony', model: '24-70 GM II', serialNumber: 'SN-LEN-005', ownershipType: 'OWNED', purchasePrice: 8500, rentalPrice: 320, status: 'AVAILABLE', location: 'Studio A' },
    { equipmentCode: 'LEN-006', name: 'Canon RF 85mm f/1.2L', category: 'Lenses', brand: 'Canon', model: 'RF 85mm', serialNumber: 'SN-LEN-006', ownershipType: 'OWNED', purchasePrice: 9500, rentalPrice: 360, status: 'AVAILABLE', location: 'Studio A' },
    { equipmentCode: 'MIC-003', name: 'Sennheiser EW 112P G4', category: 'Microphones', brand: 'Sennheiser', model: 'EW 112P G4', serialNumber: 'SN-MIC-003', ownershipType: 'OWNED', purchasePrice: 2500, rentalPrice: 150, status: 'AVAILABLE', location: 'Studio B' },
    { equipmentCode: 'LGT-004', name: 'Nanlite Forza 500', category: 'Lighting', brand: 'Nanlite', model: 'Forza 500', serialNumber: 'SN-LGT-004', ownershipType: 'OWNED', purchasePrice: 6000, rentalPrice: 350, status: 'AVAILABLE', location: 'Studio B' },
    { equipmentCode: 'LGT-005', name: 'Aputure LS 600d Pro', category: 'Lighting', brand: 'Aputure', model: 'LS 600d Pro', serialNumber: 'SN-LGT-005', ownershipType: 'OWNED', purchasePrice: 7500, rentalPrice: 420, status: 'AVAILABLE', location: 'Studio B' },
    { equipmentCode: 'SPK-004', name: 'RCF ART 915-AX Speaker', category: 'Speakers', brand: 'RCF', model: 'ART 915-AX', serialNumber: 'SN-SPK-004', ownershipType: 'OWNED', purchasePrice: 4000, rentalPrice: 320, status: 'AVAILABLE', location: 'Storage Room' },
    { equipmentCode: 'TRI-003', name: 'Gitzo GT5543LS Tripod', category: 'Tripods', brand: 'Gitzo', model: 'GT5543LS', serialNumber: 'SN-TRI-003', ownershipType: 'OWNED', purchasePrice: 1200, rentalPrice: 70, status: 'AVAILABLE', location: 'Storage Room' },
    { equipmentCode: 'GMB-002', name: 'DJI RS 4 Pro Gimbal', category: 'Gimbals', brand: 'DJI', model: 'RS 4 Pro', serialNumber: 'SN-GMB-002', ownershipType: 'OWNED', purchasePrice: 2200, rentalPrice: 140, status: 'AVAILABLE', location: 'Studio B' },
  ];

  const equipmentMap: Record<string, string> = {};

  for (const eq of equipmentData) {
    const existing = await prisma.equipment.findUnique({ where: { equipmentCode: eq.equipmentCode } });
    if (existing) {
      equipmentMap[eq.equipmentCode] = existing.id;
    } else {
      const created = await prisma.equipment.create({ data: eq });
      equipmentMap[eq.equipmentCode] = created.id;
    }
  }

  console.log(`   ✓ ${equipmentData.length} equipment items`);

  // ═══════════════════════════════════════════════════════════
  // 6. SUPPLIERS
  // ═══════════════════════════════════════════════════════════
  console.log('🚚 Creating suppliers...');

  const suppliersData = [
    { name: 'ProAudio Rentals', phone: '+966551111111', whatsapp: '+966551111111', email: 'info@proaudio.sa', address: 'Riyadh, Saudi Arabia', status: 'ACTIVE' },
    { name: 'CineGear Supply', phone: '+966552222222', whatsapp: '+966552222222', email: 'info@cinegear.sa', address: 'Jeddah, Saudi Arabia', status: 'ACTIVE' },
    { name: 'EventLight Solutions', phone: '+966553333333', whatsapp: '+966553333333', email: 'info@eventlight.sa', address: 'Riyadh, Saudi Arabia', status: 'ACTIVE' },
    { name: 'DronePro KSA', phone: '+966554444444', whatsapp: '+966554444444', email: 'contact@dronepro.sa', address: 'Riyadh, Saudi Arabia', status: 'ACTIVE' },
    { name: 'PrintHub Studio', phone: '+966555555555', whatsapp: '+966555555555', email: 'orders@printhub.sa', address: 'Jeddah, Saudi Arabia', status: 'ACTIVE' },
  ];

  const supplierMap: Record<string, string> = {};

  for (const sup of suppliersData) {
    const existing = await prisma.supplier.findFirst({ where: { name: sup.name } });
    if (existing) {
      supplierMap[sup.name] = existing.id;
    } else {
      const created = await prisma.supplier.create({ data: sup });
      supplierMap[sup.name] = created.id;
    }
  }

  console.log(`   ✓ ${suppliersData.length} suppliers`);

  // ═══════════════════════════════════════════════════════════
  // 7. CUSTOMERS
  // ═══════════════════════════════════════════════════════════
  console.log('😊 Creating customers...');

  const customersData = [
    { fullName: 'Ahmed Al-Rashid', phone: '+966501234567', whatsapp: '+966501234567', email: 'ahmed.rashid@email.com', address: 'King Fahd Road', city: 'Riyadh', source: 'WEBSITE', customerStatus: 'VIP', marketingOptIn: true, notes: 'Prefers WhatsApp communication. Wedding in September.' },
    { fullName: 'Fatima Al-Saud', phone: '+966502345678', whatsapp: '+966502345678', email: 'fatima.saud@email.com', address: 'Olaya Street', city: 'Riyadh', source: 'INSTAGRAM', customerStatus: 'ACTIVE', marketingOptIn: true, notes: 'Corporate event planner.' },
    { fullName: 'Mohammed Al-Qahtani', phone: '+966503456789', whatsapp: '+966503456789', email: 'm.qahtani@email.com', address: 'Corniche Road', city: 'Jeddah', source: 'TIKTOK', customerStatus: 'ACTIVE', marketingOptIn: true, notes: 'Interested in drone coverage.' },
    { fullName: 'Noura Al-Otaibi', phone: '+966504567890', whatsapp: '+966504567890', email: 'noura.otaibi@email.com', address: 'Prince Sultan Road', city: 'Riyadh', source: 'REFERRAL', customerStatus: 'VIP', marketingOptIn: true, notes: 'Annual corporate gala.' },
    { fullName: 'Khalid Al-Harbi', phone: '+966505678901', whatsapp: '+966505678901', email: 'khalid.harbi@email.com', address: 'Tahlia Street', city: 'Jeddah', source: 'SNAPCHAT', customerStatus: 'PREVIOUS_CUSTOMER', marketingOptIn: true, notes: 'Repeat customer — 3 bookings.' },
    { fullName: 'Sara Al-Dossari', phone: '+966506789012', whatsapp: '+966506789012', email: 'sara.dossari@email.com', address: 'Al-Malqa District', city: 'Riyadh', source: 'FACEBOOK', customerStatus: 'ACTIVE', marketingOptIn: true },
    { fullName: 'Abdullah Al-Subaie', phone: '+966507890123', whatsapp: '+966507890123', email: 'a.subaie@email.com', address: 'Al-Nakhheel', city: 'Riyadh', source: 'WHATSAPP', customerStatus: 'PREVIOUS_CUSTOMER', marketingOptIn: false, notes: 'Do not market — privacy requested.' },
    { fullName: 'Layla Al-Mutairi', phone: '+966508901234', whatsapp: '+966508901234', email: 'layla.mutairi@email.com', address: 'Al-Salama', city: 'Jeddah', source: 'WEBSITE', customerStatus: 'ACTIVE', marketingOptIn: true },
    { fullName: 'Yousef Al-Ghamdi', phone: '+966509012345', whatsapp: '+966509012345', email: 'yousef.g@email.com', address: 'Al-Zahra', city: 'Jeddah', source: 'INSTAGRAM', customerStatus: 'LEAD', marketingOptIn: true, notes: 'New lead from Instagram ad.' },
    { fullName: 'Reem Al-Shehri', phone: '+966500123456', whatsapp: '+966500123456', email: 'reem.s@email.com', address: 'Al-Wurud', city: 'Riyadh', source: 'REFERRAL', customerStatus: 'ACTIVE', marketingOptIn: true, notes: 'Referred by Ahmed Al-Rashid.' },
    { fullName: 'Faisal Al-Anazi', phone: '+966500234567', whatsapp: '+966500234567', email: 'faisal.a@email.com', address: 'Al-Ghadir', city: 'Riyadh', source: 'WALK_IN', customerStatus: 'ACTIVE', marketingOptIn: true, notes: 'Walked in for studio session.' },
    { fullName: 'Huda Al-Amri', phone: '+966500345678', whatsapp: '+966500345678', email: 'huda.amri@email.com', address: 'Al-Rabwa', city: 'Jeddah', source: 'SNAPCHAT', customerStatus: 'LEAD', marketingOptIn: true },
    { fullName: 'Turki Al-Dosari', phone: '+966500456789', whatsapp: '+966500456789', email: 'turki.d@email.com', address: 'Al-Qairawan', city: 'Riyadh', source: 'WEBSITE', customerStatus: 'INACTIVE', marketingOptIn: false, notes: 'Moved to different city.' },
    { fullName: 'Maha Al-Qarni', phone: '+966500567890', whatsapp: '+966500567890', email: 'maha.q@email.com', address: 'Al-Safa', city: 'Jeddah', source: 'TIKTOK', customerStatus: 'ACTIVE', marketingOptIn: true },
    { fullName: 'Bandar Al-Subaie', phone: '+966500678901', whatsapp: '+966500678901', email: 'bandar.s@email.com', address: 'Al-Malqa', city: 'Riyadh', source: 'OTHER', customerStatus: 'VIP', marketingOptIn: true, notes: 'Corporate client — annual contract.' },
  ];

  const customerMap: Record<string, string> = {};

  for (const cust of customersData) {
    const existing = await prisma.customer.findFirst({ where: { phone: cust.phone } });
    if (existing) {
      customerMap[cust.fullName] = existing.id;
    } else {
      const created = await prisma.customer.create({ data: cust });
      customerMap[cust.fullName] = created.id;
    }
  }

  console.log(`   ✓ ${customersData.length} customers`);

  // ═══════════════════════════════════════════════════════════
  // 8. LEADS
  // ═══════════════════════════════════════════════════════════
  console.log('🎯 Creating leads...');

  const leadsData = [
    { name: 'Omar Al-Zahrani', phone: '+966509012345', email: 'omar.z@email.com', source: 'TIKTOK', interestedService: 'Wedding Photography', eventDate: daysFromNow(35), budget: 6000, status: 'NEW', assignedToId: userMap['manager@studio.com'], utmSource: 'tiktok', utmMedium: 'ads', utmCampaign: 'summer_wedding' },
    { name: 'Huda Al-Amri', phone: '+966500123456', email: 'huda.amri@email.com', source: 'SNAPCHAT', interestedService: 'Event Videography', eventDate: daysFromNow(10), budget: 4000, status: 'CONTACTED', assignedToId: userMap['manager@studio.com'], utmSource: 'snapchat', utmMedium: 'ads', utmCampaign: 'event_promo' },
    { name: 'Faisal Al-Ghamdi', phone: '+966500234567', email: 'f.ghamdi@email.com', source: 'INSTAGRAM', interestedService: 'Studio Photography', eventDate: daysFromNow(5), budget: 1000, status: 'QUALIFIED', assignedToId: userMap['admin@studio.com'], utmSource: 'instagram', utmMedium: 'social' },
    { name: 'Reem Al-Shehri', phone: '+966500345678', email: 'reem.s@email.com', source: 'WEBSITE', interestedService: 'Wedding Videography', eventDate: daysFromNow(52), budget: 8000, status: 'PROPOSAL_SENT', assignedToId: userMap['manager@studio.com'], utmSource: 'website', utmMedium: 'organic' },
    { name: 'Turki Al-Anazi', phone: '+966500456789', email: 'turki.a@email.com', source: 'REFERRAL', interestedService: 'Audio / Sound System', eventDate: daysFromNow(15), budget: 2000, status: 'CONVERTED', assignedToId: userMap['manager@studio.com'] },
    { name: 'Maha Al-Dosari', phone: '+966500567890', email: 'maha.d@email.com', source: 'FACEBOOK', interestedService: 'Event Photography', eventDate: daysFromNow(-10), budget: 2500, status: 'LOST', assignedToId: userMap['admin@studio.com'], notes: 'Went with another studio — price too high.' },
    { name: 'Saad Al-Mutairi', phone: '+966500678901', email: 'saad.m@email.com', source: 'INSTAGRAM', interestedService: 'Drone Coverage', eventDate: daysFromNow(20), budget: 3000, status: 'NEW', assignedToId: userMap['manager@studio.com'], utmSource: 'instagram', utmMedium: 'story_ad' },
    { name: 'Noura Al-Harbi', phone: '+966500789012', email: 'noura.h@email.com', source: 'TIKTOK', interestedService: 'Live Streaming', eventDate: daysFromNow(8), budget: 5000, status: 'CONTACTED', assignedToId: userMap['manager@studio.com'], utmSource: 'tiktok', utmMedium: 'ads' },
    { name: 'Abdulaziz Al-Shehri', phone: '+966500890123', email: 'aziz.s@email.com', source: 'WEBSITE', interestedService: 'Wedding Photography', eventDate: daysFromNow(60), budget: 5500, status: 'QUALIFIED', assignedToId: userMap['admin@studio.com'] },
    { name: 'Alanoud Al-Otaibi', phone: '+966500901234', email: 'alanoud.o@email.com', source: 'SNAPCHAT', interestedService: 'Lighting Setup', eventDate: daysFromNow(3), budget: 1500, status: 'PROPOSAL_SENT', assignedToId: userMap['manager@studio.com'] },
    { name: 'Sultan Al-Qahtani', phone: '+966500012345', email: 'sultan.q@email.com', source: 'REFERRAL', interestedService: 'Video Editing', eventDate: null as any, budget: 2000, status: 'NEW', assignedToId: userMap['manager@studio.com'] },
    { name: 'Latifa Al-Dosari', phone: '+966500023456', email: 'latifa.d@email.com', source: 'INSTAGRAM', interestedService: 'Engagement Photography', eventDate: daysFromNow(25), budget: 2500, status: 'CONTACTED', assignedToId: userMap['admin@studio.com'] },
  ];

  for (const lead of leadsData) {
    const existing = await prisma.lead.findFirst({ where: { phone: lead.phone } });
    if (!existing) {
      const { eventDate, ...rest } = lead;
      await prisma.lead.create({
        data: {
          ...rest,
          eventDate: eventDate || null,
          budget: lead.budget ?? null,
        },
      });
    }
  }

  console.log(`   ✓ ${leadsData.length} leads`);

  // ═══════════════════════════════════════════════════════════
  // 9. BOOKINGS + EVENTS + SERVICES + EQUIPMENT + INVOICES + PAYMENTS
  // ═══════════════════════════════════════════════════════════
  console.log('📅 Creating bookings with full details...');

  // Helper to generate booking/invoice numbers
  let bookingSeq = 1;
  let invoiceSeq = 1;

  function generateBookingNumber(): string {
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
      String(today.getMonth() + 1).padStart(2, '0') +
      String(today.getDate()).padStart(2, '0');
    return `BK-${dateStr}-${String(bookingSeq++).padStart(4, '0')}`;
  }

  function generateInvoiceNumber(): string {
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
      String(today.getMonth() + 1).padStart(2, '0') +
      String(today.getDate()).padStart(2, '0');
    return `INV-${dateStr}-${String(invoiceSeq++).padStart(4, '0')}`;
  }

  interface BookingSeed {
    customerName: string;
    eventType: string;
    eventDate: Date;
    startTime: Date;
    endTime: Date;
    venueName: string;
    venueAddress: string;
    city: string;
    status: string;
    services: { name: string; quantity: number }[];
    equipment: { code: string; quantity: number }[];
    depositRequired: number;
    depositPaid: number;
    discount: number;
    createdByEmail: string;
    notes?: string;
  }

  const bookingsSeed: BookingSeed[] = [
    // Booking 1: Wedding — Ahmed (VIP)
    {
      customerName: 'Ahmed Al-Rashid',
      eventType: 'WEDDING',
      eventDate: daysFromNow(40),
      startTime: hoursOnDate(daysFromNow(40), 14),
      endTime: hoursOnDate(daysFromNow(40), 23),
      venueName: 'Four Seasons Hotel Riyadh',
      venueAddress: 'King Fahd Road, Olaya',
      city: 'Riyadh',
      status: 'CONFIRMED',
      services: [
        { name: 'Wedding Photography', quantity: 1 },
        { name: 'Wedding Videography', quantity: 1 },
        { name: 'Drone Coverage', quantity: 1 },
      ],
      equipment: [
        { code: 'CAM-001', quantity: 1 },
        { code: 'CAM-002', quantity: 1 },
        { code: 'LEN-001', quantity: 1 },
        { code: 'LEN-002', quantity: 1 },
        { code: 'DRN-001', quantity: 1 },
      ],
      depositRequired: 5000,
      depositPaid: 5000,
      discount: 500,
      createdByEmail: 'admin@studio.com',
      notes: 'VIP customer — premium package. 300 guests.',
    },
    // Booking 2: Corporate Event — Fatima
    {
      customerName: 'Fatima Al-Saud',
      eventType: 'CORPORATE_EVENT',
      eventDate: daysFromNow(5),
      startTime: hoursOnDate(daysFromNow(5), 9),
      endTime: hoursOnDate(daysFromNow(5), 17),
      venueName: 'Ritz-Carlton Riyadh',
      venueAddress: 'Hittin District',
      city: 'Riyadh',
      status: 'CONFIRMED',
      services: [
        { name: 'Audio / Sound System', quantity: 1 },
        { name: 'Lighting Setup', quantity: 1 },
        { name: 'Event Videography', quantity: 1 },
      ],
      equipment: [
        { code: 'SPK-001', quantity: 2 },
        { code: 'SPK-002', quantity: 1 },
        { code: 'LGT-001', quantity: 2 },
        { code: 'MIX-001', quantity: 1 },
      ],
      depositRequired: 2000,
      depositPaid: 2000,
      discount: 0,
      createdByEmail: 'manager@studio.com',
      notes: 'Corporate conference — 200 attendees.',
    },
    // Booking 3: Studio Session — Faisal
    {
      customerName: 'Faisal Al-Ghamdi',
      eventType: 'STUDIO_SESSION',
      eventDate: daysFromNow(2),
      startTime: hoursOnDate(daysFromNow(2), 10),
      endTime: hoursOnDate(daysFromNow(2), 12),
      venueName: 'Studio A',
      venueAddress: 'Studio Building',
      city: 'Riyadh',
      status: 'PENDING',
      services: [
        { name: 'Studio Photography', quantity: 1 },
        { name: 'Photo Retouching', quantity: 1 },
      ],
      equipment: [
        { code: 'CAM-003', quantity: 1 },
        { code: 'LEN-004', quantity: 1 },
        { code: 'LGT-001', quantity: 2 },
        { code: 'TRI-001', quantity: 1 },
      ],
      depositRequired: 200,
      depositPaid: 0,
      discount: 0,
      createdByEmail: 'manager@studio.com',
      notes: 'Headshot session.',
    },
    // Booking 4: Wedding — Noura (VIP, completed)
    {
      customerName: 'Noura Al-Otaibi',
      eventType: 'WEDDING',
      eventDate: daysFromNow(-15),
      startTime: hoursOnDate(daysFromNow(-15), 16),
      endTime: hoursOnDate(daysFromNow(-15), 23),
      venueName: 'Al Faisaliah Hotel',
      venueAddress: 'King Fahd Road',
      city: 'Riyadh',
      status: 'COMPLETED',
      services: [
        { name: 'Wedding Photography', quantity: 1 },
        { name: 'Wedding Videography', quantity: 1 },
        { name: 'Live Streaming', quantity: 1 },
        { name: 'Print Services', quantity: 1 },
      ],
      equipment: [
        { code: 'CAM-004', quantity: 1 },
        { code: 'CAM-001', quantity: 1 },
        { code: 'LEN-001', quantity: 1 },
        { code: 'LEN-003', quantity: 1 },
        { code: 'GMB-001', quantity: 1 },
      ],
      depositRequired: 6000,
      depositPaid: 6000,
      discount: 1000,
      createdByEmail: 'admin@studio.com',
      notes: 'VIP wedding — fully paid. Album delivery pending.',
    },
    // Booking 5: Party — Mohammed
    {
      customerName: 'Mohammed Al-Qahtani',
      eventType: 'PARTY',
      eventDate: daysFromNow(12),
      startTime: hoursOnDate(daysFromNow(12), 18),
      endTime: hoursOnDate(daysFromNow(12), 23),
      venueName: 'Jeddah Hilton',
      venueAddress: 'North Corniche Road',
      city: 'Jeddah',
      status: 'CONFIRMED',
      services: [
        { name: 'Event Photography', quantity: 1 },
        { name: 'Drone Coverage', quantity: 1 },
      ],
      equipment: [
        { code: 'CAM-002', quantity: 1 },
        { code: 'DRN-001', quantity: 1 },
        { code: 'LEN-003', quantity: 1 },
      ],
      depositRequired: 1500,
      depositPaid: 750,
      discount: 0,
      createdByEmail: 'manager@studio.com',
      notes: 'Birthday party — 100 guests.',
    },
    // Booking 6: Engagement — Sara
    {
      customerName: 'Sara Al-Dossari',
      eventType: 'ENGAGEMENT',
      eventDate: daysFromNow(7),
      startTime: hoursOnDate(daysFromNow(7), 17),
      endTime: hoursOnDate(daysFromNow(7), 21),
      venueName: 'Cultural Palace',
      venueAddress: 'Diplomatic Quarter',
      city: 'Riyadh',
      status: 'CONFIRMED',
      services: [
        { name: 'Engagement Photography', quantity: 1 },
        { name: 'Video Editing', quantity: 1 },
      ],
      equipment: [
        { code: 'CAM-003', quantity: 1 },
        { code: 'LEN-004', quantity: 1 },
        { code: 'TRI-002', quantity: 1 },
      ],
      depositRequired: 1000,
      depositPaid: 1000,
      discount: 0,
      createdByEmail: 'manager@studio.com',
      notes: 'Engagement ceremony.',
    },
    // Booking 7: Corporate — Bandar (VIP, in progress)
    {
      customerName: 'Bandar Al-Subaie',
      eventType: 'CORPORATE_EVENT',
      eventDate: daysFromNow(1),
      startTime: hoursOnDate(daysFromNow(1), 8),
      endTime: hoursOnDate(daysFromNow(1), 18),
      venueName: 'Fairmont Riyadh',
      venueAddress: 'Muroor Road',
      city: 'Riyadh',
      status: 'IN_PROGRESS',
      services: [
        { name: 'Event Photography', quantity: 1 },
        { name: 'Event Videography', quantity: 1 },
        { name: 'Live Streaming', quantity: 1 },
        { name: 'Audio / Sound System', quantity: 1 },
        { name: 'Lighting Setup', quantity: 2 },
      ],
      equipment: [
        { code: 'CAM-001', quantity: 1 },
        { code: 'CAM-004', quantity: 1 },
        { code: 'SPK-001', quantity: 2 },
        { code: 'SPK-003', quantity: 2 },
        { code: 'LGT-002', quantity: 2 },
        { code: 'MIX-001', quantity: 1 },
        { code: 'MIC-001', quantity: 2 },
      ],
      depositRequired: 8000,
      depositPaid: 8000,
      discount: 0,
      createdByEmail: 'admin@studio.com',
      notes: 'Annual corporate gala — 500 attendees. Full production package.',
    },
    // Booking 8: Studio — Layla (cancelled)
    {
      customerName: 'Layla Al-Mutairi',
      eventType: 'STUDIO_SESSION',
      eventDate: daysFromNow(-5),
      startTime: hoursOnDate(daysFromNow(-5), 11),
      endTime: hoursOnDate(daysFromNow(-5), 13),
      venueName: 'Studio B',
      venueAddress: 'Studio Building',
      city: 'Jeddah',
      status: 'CANCELLED',
      services: [
        { name: 'Studio Photography', quantity: 1 },
      ],
      equipment: [
        { code: 'CAM-002', quantity: 1 },
      ],
      depositRequired: 400,
      depositPaid: 400,
      discount: 0,
      createdByEmail: 'manager@studio.com',
      notes: 'Cancelled by customer — rescheduled.',
    },
  ];

  let bookingsCreated = 0;

  for (const bs of bookingsSeed) {
    const customerId = customerMap[bs.customerName];
    if (!customerId) continue;

    const createdBy = userMap[bs.createdByEmail] || userMap['admin@studio.com'];

    // Check if booking already exists (by customer + event date)
    const existingBooking = await prisma.booking.findFirst({
      where: { customerId, createdAt: { gte: daysFromNow(-1) } },
    });
    if (existingBooking) continue;

    // Create event
    const event = await prisma.event.create({
      data: {
        eventType: bs.eventType,
        eventDate: bs.eventDate,
        startTime: bs.startTime,
        endTime: bs.endTime,
        venueName: bs.venueName,
        venueAddress: bs.venueAddress,
        city: bs.city,
        notes: bs.notes,
      },
    });

    // Calculate totals
    let subtotal = 0;
    const serviceItems: { serviceId: string; quantity: number; unitPrice: number; discount: number; total: number; name: string }[] = [];
    for (const s of bs.services) {
      const serviceId = serviceMap[s.name];
      if (!serviceId) continue;
      const svc = await prisma.service.findUnique({ where: { id: serviceId } });
      if (!svc) continue;
      const lineTotal = Number(svc.basePrice) * s.quantity;
      subtotal += lineTotal;
      serviceItems.push({
        serviceId,
        quantity: s.quantity,
        unitPrice: Number(svc.basePrice),
        discount: 0,
        total: lineTotal,
        name: svc.name,
      });
    }

    let equipmentSubtotal = 0;
    const equipmentItems: { equipmentId: string; quantity: number; unitPrice: number; rentalCost: number; totalRevenue: number; totalCost: number }[] = [];
    for (const e of bs.equipment) {
      const equipmentId = equipmentMap[e.code];
      if (!equipmentId) continue;
      const eq = await prisma.equipment.findUnique({ where: { id: equipmentId } });
      if (!eq) continue;
      const revenue = Number(eq.rentalPrice || 0) * e.quantity;
      equipmentSubtotal += revenue;
      equipmentItems.push({
        equipmentId,
        quantity: e.quantity,
        unitPrice: Number(eq.rentalPrice || 0),
        rentalCost: 0,
        totalRevenue: revenue,
        totalCost: 0,
      });
    }

    subtotal += equipmentSubtotal;
    const discount = bs.discount;
    const taxableBase = subtotal - discount;
    const tax = Math.max(0, taxableBase * 0.15);
    const total = taxableBase + tax;

    // Create booking
    const bookingNumber = generateBookingNumber();
    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        customerId,
        eventId: event.id,
        status: bs.status,
        subtotal,
        discount,
        tax,
        total,
        paidAmount: bs.depositPaid,
        remainingAmount: Math.max(0, total - bs.depositPaid),
        depositRequired: bs.depositRequired,
        depositPaid: bs.depositPaid,
        depositDate: bs.depositPaid > 0 ? daysFromNow(-7) : null,
        nextPaymentDate: bs.status !== 'COMPLETED' && bs.status !== 'CANCELLED' ? daysFromNow(14) : null,
        notes: bs.notes,
        createdById: createdBy,
      },
    });

    // Link event to booking
    await prisma.event.update({ where: { id: event.id }, data: { bookingId: booking.id } });

    // Create booking services
    for (const si of serviceItems) {
      await prisma.bookingService.create({
        data: {
          bookingId: booking.id,
          serviceId: si.serviceId,
          quantity: si.quantity,
          unitPrice: si.unitPrice,
          discount: si.discount,
          total: si.total,
        },
      });
    }

    // Create booking equipment + update equipment status
    for (const ei of equipmentItems) {
      await prisma.bookingEquipment.create({
        data: {
          bookingId: booking.id,
          equipmentId: ei.equipmentId,
          quantity: ei.quantity,
          unitPrice: ei.unitPrice,
          rentalCost: ei.rentalCost,
          totalRevenue: ei.totalRevenue,
          totalCost: ei.totalCost,
        },
      });

      if (bs.status === 'CONFIRMED' || bs.status === 'IN_PROGRESS') {
        await prisma.equipment.update({
          where: { id: ei.equipmentId },
          data: { status: 'RESERVED' },
        });
      }
    }

    // Create invoice
    const invoiceNumber = generateInvoiceNumber();
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId,
        bookingId: booking.id,
        invoiceDate: daysFromNow(-7),
        dueDate: bs.status === 'COMPLETED' ? daysFromNow(-15) : daysFromNow(30),
        subtotal,
        discount,
        tax,
        total,
        paidAmount: bs.depositPaid,
        remainingAmount: Math.max(0, total - bs.depositPaid),
        status: bs.status === 'COMPLETED' ? 'PAID' : bs.status === 'CANCELLED' ? 'CANCELLED' : bs.depositPaid > 0 ? 'PARTIALLY_PAID' : 'DRAFT',
        notes: bs.notes,
        createdById: createdBy,
      },
    });

    // Invoice items
    for (const si of serviceItems) {
      await prisma.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          description: si.name,
          itemType: 'SERVICE',
          referenceId: si.serviceId,
          quantity: si.quantity,
          unitPrice: si.unitPrice,
          discount: si.discount,
          total: si.total,
        },
      });
    }

    for (const ei of equipmentItems) {
      const eq = await prisma.equipment.findUnique({ where: { id: ei.equipmentId } });
      await prisma.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          description: eq?.name || 'Equipment',
          itemType: 'EQUIPMENT',
          referenceId: ei.equipmentId,
          quantity: ei.quantity,
          unitPrice: ei.unitPrice,
          discount: 0,
          total: ei.totalRevenue,
        },
      });
    }

    // Payment for deposit
    if (bs.depositPaid > 0) {
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          bookingId: booking.id,
          customerId,
          amount: bs.depositPaid,
          paymentMethod: rand(['CASH', 'BANK_TRANSFER', 'CARD']),
          paymentDate: daysFromNow(-7),
          referenceNumber: `REF-${randInt(10000, 99999)}`,
          notes: 'Deposit payment',
          receivedById: createdBy,
        },
      });
    }

    // For completed bookings — add final payment
    if (bs.status === 'COMPLETED') {
      const finalPayment = total - bs.depositPaid;
      if (finalPayment > 0) {
        await prisma.payment.create({
          data: {
            invoiceId: invoice.id,
            bookingId: booking.id,
            customerId,
            amount: finalPayment,
            paymentMethod: rand(['BANK_TRANSFER', 'CARD']),
            paymentDate: daysFromNow(-10),
            referenceNumber: `REF-${randInt(10000, 99999)}`,
            notes: 'Final payment — full settlement',
            receivedById: createdBy,
          },
        });
      }
    }

    bookingsCreated++;
  }

  console.log(`   ✓ ${bookingsCreated} bookings (with events, services, equipment, invoices, payments)`);

  // ═══════════════════════════════════════════════════════════
  // 10. EXPENSES
  // ═══════════════════════════════════════════════════════════
  console.log('💸 Creating expenses...');

  const expensesData = [
    { category: 'STUDIO_RENT', description: 'Monthly studio rent — August', amount: 8000, expenseDate: daysFromNow(-8), paymentMethod: 'BANK_TRANSFER', createdBy: 'admin@studio.com' },
    { category: 'MARKETING', description: 'TikTok ads campaign — summer wedding', amount: 1500, expenseDate: daysFromNow(-7), paymentMethod: 'CARD', createdBy: 'admin@studio.com' },
    { category: 'MAINTENANCE', description: 'Camera sensor cleaning — Canon R5', amount: 300, expenseDate: daysFromNow(-5), paymentMethod: 'CASH', createdBy: 'manager@studio.com' },
    { category: 'EQUIPMENT_RENTAL', description: 'External lighting rental — Bandar event', amount: 800, expenseDate: daysFromNow(-2), paymentMethod: 'BANK_TRANSFER', supplier: 'EventLight Solutions', createdBy: 'manager@studio.com' },
    { category: 'STAFF', description: 'Freelance photographer — Noura wedding', amount: 1200, expenseDate: daysFromNow(-14), paymentMethod: 'BANK_TRANSFER', createdBy: 'admin@studio.com' },
    { category: 'TRANSPORTATION', description: 'Fuel and transportation — Jeddah events', amount: 450, expenseDate: daysFromNow(-3), paymentMethod: 'CASH', createdBy: 'manager@studio.com' },
    { category: 'UTILITIES', description: 'Electricity bill — July', amount: 600, expenseDate: daysFromNow(-10), paymentMethod: 'BANK_TRANSFER', createdBy: 'admin@studio.com' },
    { category: 'MAINTENANCE', description: 'Drone propeller replacement', amount: 250, expenseDate: daysFromNow(-1), paymentMethod: 'CARD', createdBy: 'manager@studio.com' },
    { category: 'MARKETING', description: 'Instagram sponsored posts', amount: 800, expenseDate: daysFromNow(-4), paymentMethod: 'CARD', createdBy: 'admin@studio.com' },
    { category: 'OTHER', description: 'Office supplies and printing', amount: 200, expenseDate: daysFromNow(-6), paymentMethod: 'CASH', createdBy: 'sara@studio.com' },
  ];

  for (const exp of expensesData) {
    const createdBy = userMap[exp.createdBy] || userMap['admin@studio.com'];
    await prisma.expense.create({
      data: {
        category: exp.category,
        description: exp.description,
        amount: exp.amount,
        expenseDate: exp.expenseDate,
        supplier: exp.supplier || null,
        paymentMethod: exp.paymentMethod,
        createdById: createdBy,
      },
    });
  }

  console.log(`   ✓ ${expensesData.length} expenses`);

  // ═══════════════════════════════════════════════════════════
  // 11. EXTERNAL RENTALS
  // ═══════════════════════════════════════════════════════════
  console.log('🔗 Creating external rentals...');

  // Find the Bandar booking (corporate gala)
  const bandarBooking = await prisma.booking.findFirst({
    where: { customer: { fullName: 'Bandar Al-Subaie' } },
  });

  if (bandarBooking) {
    const rentals = [
      { supplierName: 'EventLight Solutions', equipmentName: 'Moving Head Lights (4 units)', quantity: 4, rentalCost: 1200 },
      { supplierName: 'ProAudio Rentals', equipmentName: 'Line Array Speaker System', quantity: 1, rentalCost: 800 },
      { supplierName: 'DronePro KSA', equipmentName: 'DJI Inspire 3 (backup)', quantity: 1, rentalCost: 500 },
    ];

    for (const r of rentals) {
      const supplierId = supplierMap[r.supplierName];
      if (!supplierId) continue;
      await prisma.externalRental.create({
        data: {
          supplierId,
          bookingId: bandarBooking.id,
          equipmentName: r.equipmentName,
          quantity: r.quantity,
          rentalCost: r.rentalCost,
          rentalStart: daysFromNow(1),
          rentalEnd: daysFromNow(2),
          status: 'PENDING',
        },
      });
    }

    console.log(`   ✓ ${rentals.length} external rentals`);
  } else {
    console.log(`   ⚠️ Skipped external rentals (booking not found)`);
  }

  // ═══════════════════════════════════════════════════════════
  // 12. COMMUNICATIONS
  // ═══════════════════════════════════════════════════════════
  console.log('💬 Creating communications...');

  const communicationsData = [
    { customerName: 'Ahmed Al-Rashid', channel: 'WHATSAPP', direction: 'OUTBOUND', subject: 'Booking confirmation', message: 'Your wedding booking is confirmed for September 20. Deposit received. Thank you!', userId: userMap['manager@studio.com'] },
    { customerName: 'Ahmed Al-Rashid', channel: 'WHATSAPP', direction: 'INBOUND', subject: 'Re: Booking confirmation', message: 'Great! Can we schedule a meeting to discuss the shot list?', userId: null },
    { customerName: 'Fatima Al-Saud', channel: 'PHONE', direction: 'OUTBOUND', subject: 'Event details', message: 'Called to confirm AV setup requirements for the corporate event.', userId: userMap['manager@studio.com'] },
    { customerName: 'Mohammed Al-Qahtani', channel: 'EMAIL', direction: 'OUTBOUND', subject: 'Quote sent', message: 'Quote for birthday party photography and drone coverage sent via email.', userId: userMap['manager@studio.com'] },
    { customerName: 'Noura Al-Otaibi', channel: 'WHATSAPP', direction: 'OUTBOUND', subject: 'Album delivery', message: 'Your wedding album is ready for pickup at the studio.', userId: userMap['admin@studio.com'] },
    { customerName: 'Khalid Al-Harbi', channel: 'WHATSAPP', direction: 'OUTBOUND', subject: 'Follow up', message: 'Hi Khalid, hope you enjoyed the event! Here is your photo gallery link.', userId: userMap['manager@studio.com'] },
    { customerName: 'Bandar Al-Subaie', channel: 'PHONE', direction: 'INBOUND', subject: 'Production meeting', message: 'Called to discuss full production requirements for the gala.', userId: userMap['admin@studio.com'] },
    { customerName: 'Sara Al-Dossari', channel: 'EMAIL', direction: 'OUTBOUND', subject: 'Engagement session prep', message: 'Engagement session confirmed. Please arrive 15 minutes early.', userId: userMap['manager@studio.com'] },
  ];

  for (const c of communicationsData) {
    const customerId = customerMap[c.customerName];
    if (!customerId) continue;
    await prisma.communication.create({
      data: {
        customerId,
        channel: c.channel,
        direction: c.direction,
        subject: c.subject,
        message: c.message,
        userId: c.userId,
      },
    });
  }

  console.log(`   ✓ ${communicationsData.length} communications`);

  // ═══════════════════════════════════════════════════════════
  // 13. MARKETING CAMPAIGNS
  // ═══════════════════════════════════════════════════════════
  console.log('📣 Creating marketing campaigns...');

  const campaignsData = [
    {
      name: 'Summer Wedding Discount',
      message: 'Special offer! Book your wedding package before September 30 and get 15% off. Limited slots available!',
      targetSegment: 'VIP & Previous Customers',
      segmentRules: JSON.stringify({ statuses: ['VIP', 'PREVIOUS_CUSTOMER'] }),
      status: 'DRAFT',
      createdBy: 'admin@studio.com',
    },
    {
      name: 'Eid Mubarak Greeting',
      message: 'Eid Mubarak from our studio family! May this Eid bring joy and happiness.',
      targetSegment: 'All Customers',
      segmentRules: JSON.stringify({}),
      status: 'SENT',
      scheduledAt: daysFromNow(-3),
      createdBy: 'admin@studio.com',
    },
    {
      name: 'Corporate Event Promo',
      message: 'Planning a corporate event? Get a free consultation and 10% off your first booking.',
      targetSegment: 'Active Customers',
      segmentRules: JSON.stringify({ statuses: ['ACTIVE'] }),
      status: 'SCHEDULED',
      scheduledAt: daysFromNow(5),
      createdBy: 'manager@studio.com',
    },
  ];

  for (const camp of campaignsData) {
    const createdById = userMap[camp.createdBy] || userMap['admin@studio.com'];
    const existing = await prisma.marketingCampaign.findFirst({ where: { name: camp.name } });
    if (existing) continue;

    const campaign = await prisma.marketingCampaign.create({
      data: {
        name: camp.name,
        message: camp.message,
        targetSegment: camp.targetSegment,
        segmentRules: camp.segmentRules,
        scheduledAt: camp.scheduledAt || null,
        status: camp.status,
        createdById,
      },
    });

    // Add recipients for SENT campaign
    if (camp.status === 'SENT') {
      const allCustomers = await prisma.customer.findMany({ where: { deletedAt: null, marketingOptIn: true } });
      for (const cust of allCustomers) {
        await prisma.campaignRecipient.create({
          data: {
            campaignId: campaign.id,
            customerId: cust.id,
            status: 'DELIVERED',
            sentAt: daysFromNow(-3),
            deliveredAt: daysFromNow(-3),
          },
        });
      }
    }
  }

  console.log(`   ✓ ${campaignsData.length} marketing campaigns`);

  // ═══════════════════════════════════════════════════════════
  // 14. NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════
  console.log('🔔 Creating notifications...');

  const notificationsData = [
    { userEmail: 'admin@studio.com', type: 'BOOKING_CREATED', title: 'New Booking', message: 'Booking BK-001 created for Ahmed Al-Rashid', isRead: false },
    { userEmail: 'admin@studio.com', type: 'PAYMENT_RECEIVED', title: 'Payment Received', message: 'Deposit of 5000 SAR received from Ahmed Al-Rashid', isRead: false },
    { userEmail: 'manager@studio.com', type: 'LEAD_ASSIGNED', title: 'New Lead Assigned', message: 'Lead "Omar Al-Zahrani" has been assigned to you', isRead: false },
    { userEmail: 'manager@studio.com', type: 'EVENT_REMINDER', title: 'Upcoming Event', message: 'Corporate event for Fatima Al-Saud is in 5 days', isRead: true },
    { userEmail: 'manager@studio.com', type: 'BOOKING_CREATED', title: 'New Booking', message: 'Booking created for Bandar Al-Subaie — Annual Gala', isRead: false },
    { userEmail: 'sara@studio.com', type: 'INVOICE_OVERDUE', title: 'Overdue Invoice', message: 'Invoice for Layla Al-Mutairi is overdue', isRead: false },
    { userEmail: 'admin@studio.com', type: 'EQUIPMENT_MAINTENANCE', title: 'Equipment Reserved', message: 'Canon EOS R5 has been reserved for Ahmed Al-Rashid wedding', isRead: true },
    { userEmail: 'admin@studio.com', type: 'CAMPAIGN_SENT', title: 'Campaign Sent', message: 'Eid Mubarak Greeting campaign sent to all customers', isRead: true },
    { userEmail: 'manager@studio.com', type: 'PAYMENT_RECEIVED', title: 'Payment Received', message: 'Deposit of 2000 SAR received from Fatima Al-Saud', isRead: false },
    { userEmail: 'admin@studio.com', type: 'EVENT_REMINDER', title: 'Event Today', message: 'Bandar Al-Subaie corporate gala starts today at 8:00 AM', isRead: false },
  ];

  for (const n of notificationsData) {
    const userId = userMap[n.userEmail];
    if (!userId) continue;
    await prisma.notification.create({
      data: {
        userId,
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
      },
    });
  }

  console.log(`   ✓ ${notificationsData.length} notifications`);

  // ═══════════════════════════════════════════════════════════
  // 15. SETTINGS
  // ═══════════════════════════════════════════════════════════
  console.log('⚙️  Creating settings...');

  const settingsData = [
    { key: 'studio.name', value: 'REAL HOME LENS', category: 'studio' },
    { key: 'studio.phone', value: '+966500000000', category: 'studio' },
    { key: 'studio.whatsapp', value: '+966500000000', category: 'studio' },
    { key: 'studio.email', value: 'info@premiumstudio.sa', category: 'studio' },
    { key: 'studio.address', value: 'Riyadh, Saudi Arabia', category: 'studio' },
    { key: 'studio.tax_rate', value: '0', category: 'finance' },
    { key: 'studio.tax_enabled', value: 'true', category: 'finance' },
    { key: 'studio.currency', value: 'SAR', category: 'finance' },
    { key: 'studio.currency_symbol', value: 'ر.س', category: 'finance' },
    { key: 'studio.invoice_prefix', value: 'INV', category: 'finance' },
    { key: 'studio.booking_prefix', value: 'BK', category: 'finance' },
    { key: 'app.default_language', value: 'ar', category: 'app' },
    { key: 'app.default_direction', value: 'rtl', category: 'app' },
    { key: 'notifications.email_enabled', value: 'true', category: 'notifications' },
    { key: 'notifications.whatsapp_enabled', value: 'true', category: 'notifications' },
  ];

  for (const s of settingsData) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }

  console.log(`   ✓ ${settingsData.length} settings`);

  // ═══════════════════════════════════════════════════════════
  // 16. AUDIT LOGS
  // ═══════════════════════════════════════════════════════════
  console.log('📜 Creating audit logs...');

  const auditLogsData = [
    { userEmail: 'admin@studio.com', action: 'CREATE', entity: 'Booking', entityId: 'booking-001', oldValue: null, newValue: '{"status":"CONFIRMED","total":14500}' },
    { userEmail: 'manager@studio.com', action: 'UPDATE', entity: 'Lead', entityId: 'lead-001', oldValue: '{"status":"NEW"}', newValue: '{"status":"CONTACTED"}' },
    { userEmail: 'admin@studio.com', action: 'CREATE', entity: 'User', entityId: 'user-005', oldValue: null, newValue: '{"name":"Omar Admin2","role":"ADMIN"}' },
    { userEmail: 'sara@studio.com', action: 'CREATE', entity: 'Payment', entityId: 'payment-001', oldValue: null, newValue: '{"amount":5000,"method":"BANK_TRANSFER"}' },
    { userEmail: 'manager@studio.com', action: 'DELETE', entity: 'Booking', entityId: 'booking-008', oldValue: '{"status":"CANCELLED"}', newValue: null },
  ];

  for (const a of auditLogsData) {
    const userId = userMap[a.userEmail];
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action: a.action,
        entity: a.entity,
        entityId: a.entityId,
        oldValue: a.oldValue,
        newValue: a.newValue,
        ipAddress: '192.168.1.100',
      },
    });
  }

  console.log(`   ✓ ${auditLogsData.length} audit logs`);

  // ═══════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════');
  console.log('✅ Seed completed successfully!\n');
  console.log('📊 Data Summary:');
  console.log(`   • 6 Users (admin, manager, accountant, employee, viewer, admin2)`);
  console.log(`   • 6 Roles + 38 Permissions`);
  console.log(`   • 15 Customers`);
  console.log(`   • 12 Leads`);
  console.log(`   • 8 Bookings (with events, services, equipment, invoices, payments)`);
  console.log(`   • 14 Services`);
  console.log(`   • 21 Equipment items`);
  console.log(`   • 5 Suppliers`);
  console.log(`   • 3 External Rentals`);
  console.log(`   • 10 Expenses`);
  console.log(`   • 8 Communications`);
  console.log(`   • 3 Marketing Campaigns (draft, sent, scheduled)`);
  console.log(`   • 10 Notifications`);
  console.log(`   • 15 Settings`);
  console.log(`   • 5 Audit Logs`);
  console.log('\n🔑 Login Credentials:');
  console.log('   admin@studio.com    / Admin@123   (SUPER_ADMIN)');
  console.log('   manager@studio.com  / Manager@123 (MANAGER)');
  console.log('   sara@studio.com     / Sara@123    (ACCOUNTANT)');
  console.log('   khalid@studio.com   / Khalid@123  (EMPLOYEE)');
  console.log('   nora@studio.com     / Nora@123    (VIEWER)');
  console.log('   omar@studio.com     / Omar@123    (ADMIN)');
  console.log('═══════════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
