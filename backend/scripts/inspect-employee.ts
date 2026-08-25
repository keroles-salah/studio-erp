import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const role = await prisma.role.findUnique({
    where: { name: 'EMPLOYEE' },
    include: {
      permissions: {
        orderBy: [{ module: 'asc' }, { action: 'asc' }],
      },
    },
  });

  console.log(`Role: ${role?.name} - ${role?.description}`);
  console.log(`Total Permissions: ${role?.permissions.length}\n`);

  const byModule: Record<string, string[]> = {};
  role?.permissions.forEach((p) => {
    if (!byModule[p.module]) byModule[p.module] = [];
    byModule[p.module].push(p.action);
  });

  for (const [mod, actions] of Object.entries(byModule)) {
    console.log(`📁 Module [${mod}]: ${actions.join(', ')}`);
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});
