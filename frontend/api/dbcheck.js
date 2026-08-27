// dbcheck v4: dump login diagnostics — user lookup + bcrypt compare INSIDE lambda
export default async function handler(_req, res) {
  try {
    const u = new URL(process.env.DATABASE_URL);
    const mod = await import('./_bundle_prisma_check.cjs');
    const prisma = mod.prisma || (mod.default && mod.default.prisma);

    const count = await prisma.user.count();
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@studio.com' },
      select: { id: true, status: true, passwordHash: true, lastLoginAt: true },
    });

    let bcryptResult = null;
    let bcryptSource = null;
    if (admin) {
      // compare with the SAME library the auth service uses (from main bundle would be ideal,
      // but bcryptjs is bundled; import it here)
      const bcrypt = await import('bcryptjs');
      const lib = bcrypt.default || bcrypt;
      bcryptResult = await lib.compare('Admin@123', admin.passwordHash);
      bcryptSource = 'bcryptjs';
    }

    return res.status(200).json({
      host: u.hostname,
      userCount: count,
      adminFound: !!admin,
      adminStatus: admin?.status,
      hashLen: admin?.passwordHash?.length,
      hashPrefix: admin?.passwordHash?.slice(0, 7),
      lastLoginAt: admin?.lastLoginAt,
      bcryptCompare_AdminAt123: bcryptResult,
      bcryptSource,
    });
  } catch (e) {
    return res.status(200).json({ error: String(e.message || e).slice(0, 300) });
  }
}
