// dbcheck v6: measure post-region-move
export default async function handler(_req, res) {
  const t = [];
  const mark = (name) => t.push([name, Date.now()]);
  try {
    mark('start');
    const mod = await import('./_bundle_prisma_check.cjs');
    const prisma = mod.prisma || (mod.default && mod.default.prisma);
    mark('import');

    await prisma.$queryRaw`SELECT 1`;
    mark('first_query');

    await prisma.$queryRaw`SELECT 1`;
    mark('second_query');

    await prisma.$queryRaw`SELECT 1`;
    mark('third_query');

    const deltas = {};
    for (let i = 1; i < t.length; i++) {
      deltas[t[i][0]] = t[i][1] - t[i-1][1];
    }
    await prisma.$disconnect();
    return res.status(200).json({ total_ms: Date.now() - t[0][1], deltas });
  } catch (e) {
    return res.status(200).json({ error: String(e.message || e).slice(0, 200), timings: t });
  }
}
