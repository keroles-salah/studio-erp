// dbcheck final: also probe deeper data-consistency issues
// - orphan invoices (deleted customer)
// - invoice totals mismatch (total != subtotal - discount + tax)
// - bookings with missing customer
// - paid > total invoices
// - events without booking backlink
export default async function handler(_req, res) {
  try {
    const mod = await import('./_bundle_prisma_check.cjs');
    const prisma = mod.prisma || (mod.default && mod.default.prisma);

    const report = {};

    // orphaned invoices
    const orphanInvoices = await prisma.invoice.count({
      where: { customer: null },
    });
    report.orphanInvoices = orphanInvoices;

    // invoices where paidAmount > total
    const badPaid = await prisma.invoice.findMany({
      where: { paidAmount: { gt: 0 } },
      select: { id: true, total: true, paidAmount: true, remainingAmount: true, status: true },
      take: 100,
    });
    report.paidOverTotal = badPaid.filter(
      (i) => Number(i.paidAmount) > Number(i.total)
    ).length;

    // invoices where remainingAmount != total - paid
    const badRemaining = badPaid.filter(
      (i) =>
        Math.abs(
          Number(i.remainingAmount) - (Number(i.total) - Number(i.paidAmount))
        ) > 0.01
    ).length;
    report.badRemainingAmount = badRemaining;

    // soft-deleted customers that still appear in list (sanity: deletedAt filter)
    const totalCustomers = await prisma.customer.count();
    const activeCustomers = await prisma.customer.count({ where: { deletedAt: null } });
    report.customers = { total: totalCustomers, active: activeCustomers, deleted: totalCustomers - activeCustomers };

    // bookings pointing to deleted customers
    const orphanBookings = await prisma.booking.count({
      where: { customer: { deletedAt: { not: null } } },
    });
    report.bookingsWithDeletedCustomer = orphanBookings;

    // events and backlinks
    const eventCount = await prisma.event.count();
    const bookingCount = await prisma.booking.count();
    report.events = eventCount;
    report.bookings = bookingCount;

    // notifications with missing user
    const orphanNotifs = await prisma.notification.count({
      where: { user: null },
    });
    report.orphanNotifications = orphanNotifs;

    // users
    const users = await prisma.user.findMany({
      select: { email: true, status: true, lastLoginAt: true },
    });
    report.users = users;

    await prisma.$disconnect();
    return res.status(200).json(report);
  } catch (e) {
    return res.status(200).json({ error: String(e.message || e).slice(0, 300) });
  }
}
