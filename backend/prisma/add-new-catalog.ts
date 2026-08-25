/**
 * Studio ERP - Add NEW catalog items only (2 services + 10 equipment)
 * Does NOT touch customers / bookings / invoices / other demo data.
 *
 * Run from backend/:   npx ts-node prisma/add-new-catalog.ts
 * Idempotent: skips items that already exist.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const newServices = [
  { name: 'Engagement Session', description: 'Pre-wedding engagement photo session (2 hours)', category: 'Photography', basePrice: 1500, cost: 200, taxRate: 15, status: 'ACTIVE' },
  { name: 'Drone Aerial Coverage', description: 'Aerial drone videography for events (per hour)', category: 'Videography', basePrice: 900, cost: 150, taxRate: 15, status: 'ACTIVE' },
];

const newEquipment = [
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

async function main() {
  let svcAdded = 0, svcSkipped = 0;
  for (const s of newServices) {
    const existing = await prisma.service.findFirst({ where: { name: s.name } });
    if (existing) { svcSkipped += 1; continue; }
    await prisma.service.create({ data: s });
    svcAdded += 1;
  }

  let eqAdded = 0, eqSkipped = 0;
  for (const e of newEquipment) {
    const existing = await prisma.equipment.findUnique({ where: { equipmentCode: e.equipmentCode } });
    if (existing) { eqSkipped += 1; continue; }
    await prisma.equipment.create({ data: e });
    eqAdded += 1;
  }

  console.log('Services  : %d added, %d skipped (already exist)', svcAdded, svcSkipped);
  console.log('Equipment : %d added, %d skipped (already exist)', eqAdded, eqSkipped);
  console.log('Total services  now: %d', await prisma.service.count());
  console.log('Total equipment now: %d', await prisma.equipment.count());
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
