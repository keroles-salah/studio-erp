// dbcheck v2: raw client, only instantiate when env var present
export default async function handler(_req, res) {
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(200).json({ error: 'DATABASE_URL missing' });
    }
    const u = new URL(process.env.DATABASE_URL);
    const mod = await import('./_bundle_prisma_check.cjs');
    const PrismaClient = mod.default?.PrismaClient || mod.PrismaClient;
    const prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
    const count = await prisma.user.count();
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@studio.com' },
      select: { lastLoginAt: true, updatedAt: true },
    });
    await prisma.$disconnect();
    return res.status(200).json({
      host: u.hostname,
      db: u.pathname,
      user: u.username,
      hasPassword: !!u.password && u.password.length > 0,
      passwordLen: decodeURIComponent(u.password || '').length,
      params: u.search,
      userCount: count,
      adminLastLogin: admin?.lastLoginAt,
      adminUpdatedAt: admin?.updatedAt,
    });
  } catch (e) {
    return res.status(200).json({ error: String(e.message || e).slice(0, 300) });
  }
}
