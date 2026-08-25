import { prisma } from '../../config/prisma';

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export class DashboardService {
  /**
   * Get comprehensive dashboard data in a single call.
   * Returns top cards, charts, and recent activity.
   */
  async getDashboardData() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLast12Months = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    // Run all independent queries in parallel
    const [
      totalRevenueResult,
      monthlyRevenueResult,
      monthlyExpensesResult,
      upcomingEvents,
      upcomingEventsCount,
      pendingPaymentsResult,
      totalCustomers,
      newLeadsCount,
      revenueChart,
      expensesChart,
      recentPayments,
      recentCustomers,
      recentBookings,
      equipmentStatusSummary,
      revenueByService,
      leadsBySource,
    ] = await Promise.all([
      // --- Top Cards ---
      // Total revenue (all time, excluding CANCELLED/DRAFT invoices)
      prisma.invoice.aggregate({
        where: {
          status: { notIn: ['CANCELLED', 'DRAFT'] },
          deletedAt: null,
        },
        _sum: { total: true },
      }),

      // Monthly revenue
      prisma.invoice.aggregate({
        where: {
          status: { notIn: ['CANCELLED', 'DRAFT'] },
          deletedAt: null,
          invoiceDate: { gte: startOfMonth },
        },
        _sum: { total: true },
      }),

      // Monthly expenses
      prisma.expense.aggregate({
        where: {
          expenseDate: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),

      // Upcoming events (next 5)
      prisma.event.findMany({
        where: {
          eventDate: { gte: now },
        },
        include: {
          booking: {
            include: {
              customer: { select: { id: true, fullName: true } },
              services: { include: { service: { select: { id: true, name: true } } } },
            },
          },
        },
        orderBy: { eventDate: 'asc' },
        take: 5,
      }),

      // Upcoming events count (all upcoming, not capped at 5)
      prisma.event.count({
        where: { eventDate: { gte: now } },
      }),

      // Pending payments total (outstanding balances)
      prisma.invoice.aggregate({
        where: {
          status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
          deletedAt: null,
          remainingAmount: { gt: 0 },
        },
        _sum: { remainingAmount: true },
      }),

      // Total customers
      prisma.customer.count({ where: { deletedAt: null } }),

      // New leads count (this month)
      prisma.lead.count({
        where: {
          createdAt: { gte: startOfMonth },
          status: { in: ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT'] },
        },
      }),

      // --- Charts ---
      // Revenue chart (last 12 months)
      prisma.invoice.findMany({
        where: {
          status: { notIn: ['CANCELLED', 'DRAFT'] },
          deletedAt: null,
          invoiceDate: { gte: startOfLast12Months },
        },
        select: { total: true, invoiceDate: true },
        orderBy: { invoiceDate: 'asc' },
      }),

      // Expenses chart (last 12 months by category)
      prisma.expense.findMany({
        where: {
          expenseDate: { gte: startOfLast12Months },
        },
        select: { amount: true, category: true, expenseDate: true },
        orderBy: { expenseDate: 'asc' },
      }),

      // --- Recent Activity ---
      // Recent payments (last 5)
      prisma.payment.findMany({
        include: {
          invoice: { select: { invoiceNumber: true } },
          customer: { select: { fullName: true } },
        },
        orderBy: { paymentDate: 'desc' },
        take: 5,
      }),

      // Recent customers (last 5)
      prisma.customer.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          fullName: true,
          phone: true,
          source: true,
          customerStatus: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // Recent bookings (last 5)
      prisma.booking.findMany({
        where: { deletedAt: null },
        include: {
          customer: { select: { id: true, fullName: true } },
          event: { select: { eventType: true, eventDate: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // Equipment status summary
      prisma.equipment.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { status: true },
      }),

      // Revenue by service (current month)
      prisma.bookingService.findMany({
        where: {
          booking: {
            createdAt: { gte: startOfMonth },
            deletedAt: null,
          },
        },
        include: {
          service: { select: { name: true } },
        },
      }),

      // Leads by source (current month)
      prisma.lead.groupBy({
        by: ['source'],
        where: {
          createdAt: { gte: startOfMonth },
        },
        _count: { source: true },
      }),
    ]);

    // ------------------------------------------------------------------
    // Process chart data
    // ------------------------------------------------------------------

    // Revenue chart: last 12 months
    const revenueByMonth = new Map<string, number>();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      revenueByMonth.set(monthKey(d), 0);
    }
    for (const inv of revenueChart) {
      const key = monthKey(inv.invoiceDate);
      if (revenueByMonth.has(key)) {
        revenueByMonth.set(key, revenueByMonth.get(key)! + inv.total.toNumber());
      }
    }
    const revenueChartData = Array.from(revenueByMonth.entries()).map(([label, value]) => ({
      label,
      value,
    }));

    // Expenses chart: last 12 months by category
    const expenseByMonthCategory = new Map<string, Map<string, number>>();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      expenseByMonthCategory.set(monthKey(d), new Map());
    }
    const allCategories = new Set<string>();
    for (const exp of expensesChart) {
      const expMonthKey = monthKey(exp.expenseDate);
      if (expenseByMonthCategory.has(expMonthKey)) {
        const catMap = expenseByMonthCategory.get(expMonthKey)!;
        catMap.set(exp.category, (catMap.get(exp.category) ?? 0) + exp.amount.toNumber());
        allCategories.add(exp.category);
      }
    }
    const expenseCategories = Array.from(allCategories).sort();
    const expensesChartData = Array.from(expenseByMonthCategory.entries()).map(
      ([label, catMap]) => ({
        label,
        ...Object.fromEntries(
          expenseCategories.map((cat) => [cat, catMap.get(cat) ?? 0]),
        ),
      }),
    );

    // Profit chart: last 12 months
    const expensesByMonth = new Map<string, number>();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      expensesByMonth.set(monthKey(d), 0);
    }
    for (const exp of expensesChart) {
      const key = monthKey(exp.expenseDate);
      if (expensesByMonth.has(key)) {
        expensesByMonth.set(key, expensesByMonth.get(key)! + exp.amount.toNumber());
      }
    }
    const profitChartData = revenueChartData.map((rev) => ({
      label: rev.label,
      revenue: rev.value,
      expenses: expensesByMonth.get(rev.label) ?? 0,
      profit: rev.value - (expensesByMonth.get(rev.label) ?? 0),
    }));

    // Revenue by service
    const serviceRevenueMap = new Map<string, number>();
    for (const bs of revenueByService) {
      const name = bs.service.name;
      serviceRevenueMap.set(name, (serviceRevenueMap.get(name) ?? 0) + bs.total.toNumber());
    }
    const revenueByServiceData = Array.from(serviceRevenueMap.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    // Leads by source
    const leadsBySourceData = leadsBySource.map((item) => ({
      label: item.source,
      value: item._count.source,
    }));

    // ------------------------------------------------------------------
    // Build response
    // ------------------------------------------------------------------

    const totalRevenue = totalRevenueResult._sum.total?.toNumber() ?? 0;
    const monthlyRevenue = monthlyRevenueResult._sum.total?.toNumber() ?? 0;
    const monthlyExpenses = monthlyExpensesResult._sum.amount?.toNumber() ?? 0;
    const pendingPayments = pendingPaymentsResult._sum.remainingAmount?.toNumber() ?? 0;

    return {
      // Top cards
      topCards: {
        totalRevenue,
        monthlyRevenue,
        monthlyExpenses,
        netProfit: monthlyRevenue - monthlyExpenses,
        upcomingEventsCount,
        pendingPayments,
        totalCustomers,
        newLeads: newLeadsCount,
      },

      // Charts
      charts: {
        revenue: revenueChartData,
        expenses: {
          categories: expenseCategories,
          data: expensesChartData,
        },
        profit: profitChartData,
        revenueByService: revenueByServiceData,
        leadsBySource: leadsBySourceData,
      },

      // Upcoming events
      upcomingEvents: upcomingEvents.map((event) => ({
        id: event.id,
        eventType: event.eventType,
        eventDate: event.eventDate,
        startTime: event.startTime,
        endTime: event.endTime,
        venueName: event.venueName,
        venueAddress: event.venueAddress,
        city: event.city,
        customer: event.booking?.customer
          ? {
              id: event.booking.customer.id,
              fullName: event.booking.customer.fullName,
            }
          : null,
        services: event.booking?.services.map((bs) => ({
          id: bs.service.id,
          name: bs.service.name,
        })) ?? [],
        bookingStatus: event.booking?.status ?? null,
        bookingNumber: event.booking?.bookingNumber ?? null,
      })),

      // Recent payments
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        amount: p.amount.toNumber(),
        paymentMethod: p.paymentMethod,
        paymentDate: p.paymentDate,
        referenceNumber: p.referenceNumber,
        invoiceNumber: p.invoice?.invoiceNumber,
        customerName: p.customer?.fullName,
      })),

      // Recent customers
      recentCustomers: recentCustomers.map((c) => ({
        id: c.id,
        fullName: c.fullName,
        phone: c.phone,
        source: c.source,
        customerStatus: c.customerStatus,
        createdAt: c.createdAt,
      })),

      // Recent bookings
      recentBookings: recentBookings.map((b) => ({
        id: b.id,
        bookingNumber: b.bookingNumber,
        status: b.status,
        total: b.total.toNumber(),
        customer: b.customer
          ? { id: b.customer.id, fullName: b.customer.fullName }
          : null,
        eventType: b.event?.eventType ?? null,
        eventDate: b.event?.eventDate ?? null,
        createdAt: b.createdAt,
      })),

      // Equipment status summary
      equipmentStatus: equipmentStatusSummary.map((item) => ({
        status: item.status,
        count: item._count.status,
      })),
    };
  }
}

export const dashboardService = new DashboardService();
