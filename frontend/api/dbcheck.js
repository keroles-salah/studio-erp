import { PrismaClient } from './_bundle_prisma_check.cjs';

export default async function handler(_req, res) {
  try {
    const u = new URL(process.env.DATABASE_URL);
    const host = u.hostname;
    const db = u.pathname;
    const user = u.username;
    const prisma = new PrismaClient();
    const count = await prisma.user.count();
    const admin = await prisma.user.findUnique({ where: { email: 'admin@studio.com' }, select: { lastLoginAt: true, updatedAt: true } });
    await prisma.$disconnect();
    res.status(200).json({ host, db, user, userCount: count, adminLastLogin: admin?.lastLoginAt, adminUpdatedAt: admin?.updatedAt });
  } catch (e) {
    res.status(200).json({ error: String(e.message || e).slice(0, 200) });
  }
}
