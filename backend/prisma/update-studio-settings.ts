/**
 * One-off: update studio branding settings (name/email) + ensure vat_number exists.
 * Run from backend/:  npx ts-node prisma/update-studio-settings.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const updates = [
    { key: 'studio.name', value: 'REAL HOME LENS' },
    { key: 'studio.email', value: 'info@realhomelens.sa' },
    { key: 'studio.vat_number', value: '' },
  ];
  for (const u of updates) {
    await prisma.setting.upsert({
      where: { key: u.key },
      update: { value: u.value },
      create: { key: u.key, value: u.value, category: 'studio' },
    });
    console.log('OK', u.key, '=', JSON.stringify(u.value));
  }
  console.log('DONE settings');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
