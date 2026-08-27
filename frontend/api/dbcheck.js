// Measure the DB query time from INSIDE the lambda vs outside.
// Reuse the shared prisma from the check bundle.
export default async function handler(_req, res) {
  const t = [];
  const mark = (name) => t.push([name, Date.now()]);
  try {
    mark('start');
    const u = new URL(process.env.DATABASE_URL);
    const mod = await import('./_bundle_prisma_check.cjs');
    const prisma = mod.prisma || (mod.default && mod.default.prisma);
    mark('import');

    await prisma.$queryRaw`SELECT 1`;
    mark('first_query');

    await prisma.$queryRaw`SELECT 1`;
    mark('second_query');

    const count = await prisma.user.count();
    mark('user_count');

    const admin = await prisma.user.findUnique({
      where: { email: 'admin@studio.com' },
      select: { id: true },
    });
    mark('user_lookup');

    const t0 = t[0][1];
    const deltas = {};
    for (let i = 1; i < t.length; i++) {
      deltas[t[i][0]] = t[i][1] - t[i-1][1];
    }
    await prisma.$disconnect();
    return res.status(200).json({ total_ms: Date.now() - t0, deltas, userCount: count });
  } catch (e) {
    return res.status(200).json({ error: String(e.message || e).slice(0, 200), timings: t });
  }
}
