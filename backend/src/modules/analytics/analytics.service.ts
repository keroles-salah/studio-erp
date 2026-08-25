import { prisma } from '../../config/prisma';

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export interface AnalyticsDateRange {
  fromDate?: Date;
  toDate?: Date;
}

export class AnalyticsService {
  /**
   * Get structured revenue analytics suitable for AI consumption.
   * Returns time-series, breakdowns, and summary statistics.
   */
  async getRevenueAnalytics(range: AnalyticsDateRange) {
    const where: Record<string, unknown> = {
      status: { notIn: ['CANCELLED', 'DRAFT'] },
      deletedAt: null,
    };

    if (range.fromDate || range.toDate) {
      where.invoiceDate = {};
      if (range.fromDate) (where.invoiceDate as Record<string, unknown>).gte = range.fromDate;
      if (range.toDate) (where.invoiceDate as Record<string, unknown>).lte = range.toDate;
    }

    const [invoices, statusBreakdown, monthlyAgg] = await Promise.all([
      prisma.invoice.findMany({
        where: where as never,
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
          paidAmount: true,
          remainingAmount: true,
          invoiceDate: true,
          status: true,
          customer: { select: { id: true, fullName: true, source: true } },
        },
        orderBy: { invoiceDate: 'asc' },
      }),
      prisma.invoice.groupBy({
        by: ['status'],
        where: where as never,
        _count: { status: true },
        _sum: { total: true, paidAmount: true, remainingAmount: true },
      }),
      prisma.invoice.findMany({
        where: {
          ...where,
          invoiceDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1),
          },
        } as never,
        select: { total: true, paidAmount: true, invoiceDate: true },
        orderBy: { invoiceDate: 'asc' },
      }),
    ]);

    // Monthly time series (last 12 months)
    const monthlyMap = new Map<string, { revenue: number; paid: number; count: number }>();
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      monthlyMap.set(monthKey(d), { revenue: 0, paid: 0, count: 0 });
    }
    for (const inv of monthlyAgg) {
      const key = monthKey(inv.invoiceDate);
      if (monthlyMap.has(key)) {
        const existing = monthlyMap.get(key)!;
        existing.revenue += inv.total.toNumber();
        existing.paid += inv.paidAmount.toNumber();
        existing.count += 1;
      }
    }

    return {
      summary: {
        totalRevenue: invoices.reduce((s, i) => s + i.total.toNumber(), 0),
        totalPaid: invoices.reduce((s, i) => s + i.paidAmount.toNumber(), 0),
        totalOutstanding: invoices.reduce((s, i) => s + i.remainingAmount.toNumber(), 0),
        invoiceCount: invoices.length,
        averageInvoiceValue: invoices.length > 0
          ? Number((invoices.reduce((s, i) => s + i.total.toNumber(), 0) / invoices.length).toFixed(2))
          : 0,
      },
      statusBreakdown: statusBreakdown.map((s) => ({
        status: s.status,
        count: s._count.status,
        totalValue: s._sum.total?.toNumber() ?? 0,
        paidAmount: s._sum.paidAmount?.toNumber() ?? 0,
        remainingAmount: s._sum.remainingAmount?.toNumber() ?? 0,
      })),
      monthlyTimeSeries: Array.from(monthlyMap.entries()).map(([label, v]) => ({
        label,
        revenue: v.revenue,
        paid: v.paid,
        count: v.count,
      })),
      revenueByCustomerSource: this.groupByCustomerSource(invoices),
    };
  }

  /**
   * Get structured profit analytics for AI consumption.
   */
  async getProfitAnalytics(range: AnalyticsDateRange) {
    const dateFilter: Record<string, unknown> = {};
    if (range.fromDate) dateFilter.gte = range.fromDate;
    if (range.toDate) dateFilter.lte = range.toDate;

    const invoiceWhere: Record<string, unknown> = {
      status: { notIn: ['CANCELLED', 'DRAFT'] },
      deletedAt: null,
    };
    const expenseWhere: Record<string, unknown> = {};

    if (range.fromDate || range.toDate) {
      invoiceWhere.invoiceDate = { ...dateFilter };
      expenseWhere.expenseDate = { ...dateFilter };
    }

    const [invoices, expenses] = await Promise.all([
      prisma.invoice.findMany({
        where: invoiceWhere as never,
        select: { total: true, paidAmount: true, invoiceDate: true },
        orderBy: { invoiceDate: 'asc' },
      }),
      prisma.expense.findMany({
        where: expenseWhere as never,
        select: { amount: true, category: true, expenseDate: true },
        orderBy: { expenseDate: 'asc' },
      }),
    ]);

    const totalRevenue = invoices.reduce((s, i) => s + i.total.toNumber(), 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount.toNumber(), 0);
    const totalProfit = totalRevenue - totalExpenses;

    // Monthly profit series (last 12 months)
    const now = new Date();
    const monthMap = new Map<string, { revenue: number; expenses: number }>();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      monthMap.set(monthKey(d), { revenue: 0, expenses: 0 });
    }

    for (const inv of invoices) {
      const key = monthKey(inv.invoiceDate);
      if (monthMap.has(key)) {
        monthMap.get(key)!.revenue += inv.total.toNumber();
      }
    }
    for (const exp of expenses) {
      const key = monthKey(exp.expenseDate);
      if (monthMap.has(key)) {
        monthMap.get(key)!.expenses += exp.amount.toNumber();
      }
    }

    // Expenses by category
    const categoryMap = new Map<string, number>();
    for (const exp of expenses) {
      categoryMap.set(exp.category, (categoryMap.get(exp.category) ?? 0) + exp.amount.toNumber());
    }

    return {
      summary: {
        totalRevenue,
        totalExpenses,
        totalProfit,
        profitMargin: totalRevenue > 0
          ? Number(((totalProfit / totalRevenue) * 100).toFixed(2))
          : 0,
      },
      monthlyProfitSeries: Array.from(monthMap.entries()).map(([label, v]) => ({
        label,
        revenue: v.revenue,
        expenses: v.expenses,
        profit: v.revenue - v.expenses,
        margin: v.revenue > 0
          ? Number((((v.revenue - v.expenses) / v.revenue) * 100).toFixed(2))
          : 0,
      })),
      expensesByCategory: Array.from(categoryMap.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value),
    };
  }

  /**
   * Get structured customer analytics for AI consumption.
   */
  async getCustomerAnalytics(range: AnalyticsDateRange) {
    const dateFilter: Record<string, unknown> = {};
    if (range.fromDate) dateFilter.gte = range.fromDate;
    if (range.toDate) dateFilter.lte = range.toDate;

    const customerWhere: Record<string, unknown> = { deletedAt: null };
    if (range.fromDate || range.toDate) {
      customerWhere.createdAt = { ...dateFilter };
    }

    const [
      customers,
      totalCustomers,
      bySource,
      byStatus,
      topSpenders,
    ] = await Promise.all([
      prisma.customer.findMany({
        where: customerWhere as never,
        select: {
          id: true,
          fullName: true,
          source: true,
          customerStatus: true,
          createdAt: true,
          invoices: {
            where: { status: { notIn: ['CANCELLED', 'DRAFT'] }, deletedAt: null },
            select: { total: true, paidAmount: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where: { deletedAt: null } }),
      prisma.customer.groupBy({
        by: ['source'],
        where: { deletedAt: null },
        _count: { source: true },
      }),
      prisma.customer.groupBy({
        by: ['customerStatus'],
        where: { deletedAt: null },
        _count: { customerStatus: true },
      }),
      prisma.customer.findMany({
        where: { deletedAt: null },
        include: {
          invoices: {
            where: { status: { notIn: ['CANCELLED', 'DRAFT'] }, deletedAt: null },
            select: { total: true },
          },
        },
      }),
    ]);

    // Calculate spending for top spenders
    const spendersWithTotal = topSpenders
      .map((c) => ({
        id: c.id,
        fullName: c.fullName,
        totalSpending: c.invoices.reduce((s, i) => s + i.total.toNumber(), 0),
        invoiceCount: c.invoices.length,
      }))
      .sort((a, b) => b.totalSpending - a.totalSpending)
      .slice(0, 20);

    // Monthly new customer trend (last 12 months)
    const now = new Date();
    const monthMap = new Map<string, number>();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      monthMap.set(monthKey(d), 0);
    }
    for (const c of customers) {
      const key = monthKey(c.createdAt);
      if (monthMap.has(key)) {
        monthMap.set(key, monthMap.get(key)! + 1);
      }
    }

    return {
      summary: {
        totalCustomers,
        newCustomersInPeriod: customers.length,
        averageSpendPerCustomer: totalCustomers > 0
          ? Number((spendersWithTotal.reduce((s, c) => s + c.totalSpending, 0) / totalCustomers).toFixed(2))
          : 0,
      },
      bySource: bySource.map((s) => ({ source: s.source, count: s._count.source })),
      byStatus: byStatus.map((s) => ({ status: s.customerStatus, count: s._count.customerStatus })),
      newCustomerTrend: Array.from(monthMap.entries()).map(([label, value]) => ({ label, value })),
      topSpenders,
    };
  }

  /**
   * Get structured equipment analytics for AI consumption.
   */
  async getEquipmentAnalytics(range: AnalyticsDateRange) {
    const bookingWhere: Record<string, unknown> = { deletedAt: null };
    if (range.fromDate || range.toDate) {
      const dateFilter: Record<string, unknown> = {};
      if (range.fromDate) dateFilter.gte = range.fromDate;
      if (range.toDate) dateFilter.lte = range.toDate;
      bookingWhere.createdAt = { ...dateFilter };
    }

    const [equipment, statusBreakdown, categoryBreakdown] = await Promise.all([
      prisma.equipment.findMany({
        where: { deletedAt: null },
        include: {
          bookings: {
            where: { booking: bookingWhere as never },
            include: { booking: { select: { bookingNumber: true, status: true } } },
          },
        },
      }),
      prisma.equipment.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { status: true },
      }),
      prisma.equipment.groupBy({
        by: ['category'],
        where: { deletedAt: null },
        _count: { category: true },
      }),
    ]);

    const equipmentStats = equipment.map((eq) => {
      const bookings = eq.bookings;
      const revenue = bookings.reduce((s, b) => s + b.totalRevenue.toNumber(), 0);
      const cost = bookings.reduce((s, b) => s + b.totalCost.toNumber(), 0);

      return {
        id: eq.id,
        equipmentCode: eq.equipmentCode,
        name: eq.name,
        category: eq.category,
        ownershipType: eq.ownershipType,
        status: eq.status,
        utilizationCount: bookings.length,
        totalRevenue: revenue,
        totalCost: cost,
        profit: revenue - cost,
        utilizationRate: bookings.length > 0
          ? Number(((bookings.length / equipment.length) * 100).toFixed(2))
          : 0,
      };
    });

    return {
      summary: {
        totalEquipment: equipment.length,
        totalUtilization: equipmentStats.reduce((s, e) => s + e.utilizationCount, 0),
        totalRevenue: equipmentStats.reduce((s, e) => s + e.totalRevenue, 0),
        totalCost: equipmentStats.reduce((s, e) => s + e.totalCost, 0),
        totalProfit: equipmentStats.reduce((s, e) => s + e.profit, 0),
      },
      statusBreakdown: statusBreakdown.map((s) => ({
        status: s.status,
        count: s._count.status,
      })),
      categoryBreakdown: categoryBreakdown.map((c) => ({
        category: c.category,
        count: c._count.category,
      })),
      equipment: equipmentStats.sort((a, b) => b.utilizationCount - a.utilizationCount),
    };
  }

  /**
   * Get structured booking analytics for AI consumption.
   */
  async getBookingAnalytics(range: AnalyticsDateRange) {
    const where: Record<string, unknown> = { deletedAt: null };
    if (range.fromDate || range.toDate) {
      const dateFilter: Record<string, unknown> = {};
      if (range.fromDate) dateFilter.gte = range.fromDate;
      if (range.toDate) dateFilter.lte = range.toDate;
      where.createdAt = { ...dateFilter };
    }

    const [
      bookings,
      statusBreakdown,
      serviceBreakdown,
      monthlyTrend,
    ] = await Promise.all([
      prisma.booking.findMany({
        where: where as never,
        select: {
          id: true,
          bookingNumber: true,
          status: true,
          total: true,
          paidAmount: true,
          remainingAmount: true,
          createdAt: true,
          customer: { select: { id: true, fullName: true, source: true } },
          event: { select: { eventType: true, eventDate: true } },
          services: { include: { service: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.booking.groupBy({
        by: ['status'],
        where: where as never,
        _count: { status: true },
        _sum: { total: true },
      }),
      prisma.bookingService.groupBy({
        by: ['serviceId'],
        where: { booking: where as never },
        _count: { serviceId: true },
        _sum: { total: true },
      }),
      prisma.booking.findMany({
        where: {
          ...where,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1),
          },
        } as never,
        select: { total: true, createdAt: true, status: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Monthly trend (last 12 months)
    const now = new Date();
    const monthMap = new Map<string, { count: number; value: number }>();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      monthMap.set(monthKey(d), { count: 0, value: 0 });
    }
    for (const b of monthlyTrend) {
      const key = monthKey(b.createdAt);
      if (monthMap.has(key)) {
        const existing = monthMap.get(key)!;
        existing.count += 1;
        existing.value += b.total.toNumber();
      }
    }

    // Service names lookup
    const serviceIds = serviceBreakdown.map((s) => s.serviceId);
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, name: true },
    });
    const serviceNameMap = new Map(services.map((s) => [s.id, s.name]));

    return {
      summary: {
        totalBookings: bookings.length,
        totalValue: bookings.reduce((s, b) => s + b.total.toNumber(), 0),
        totalPaid: bookings.reduce((s, b) => s + b.paidAmount.toNumber(), 0),
        totalRemaining: bookings.reduce((s, b) => s + b.remainingAmount.toNumber(), 0),
        averageBookingValue: bookings.length > 0
          ? Number((bookings.reduce((s, b) => s + b.total.toNumber(), 0) / bookings.length).toFixed(2))
          : 0,
      },
      statusBreakdown: statusBreakdown.map((s) => ({
        status: s.status,
        count: s._count.status,
        totalValue: s._sum.total?.toNumber() ?? 0,
      })),
      serviceBreakdown: serviceBreakdown.map((s) => ({
        serviceName: serviceNameMap.get(s.serviceId) ?? 'Unknown',
        count: s._count.serviceId,
        totalValue: s._sum.total?.toNumber() ?? 0,
      })),
      monthlyTrend: Array.from(monthMap.entries()).map(([label, v]) => ({
        label,
        count: v.count,
        value: v.value,
      })),
    };
  }

  /**
   * Helper: Group invoices by customer source.
   */
  private groupByCustomerSource(
    invoices: Array<{
      customer: { source: string } | null;
      total: { toNumber: () => number };
    }>,
  ) {
    const map = new Map<string, { count: number; revenue: number }>();
    for (const inv of invoices) {
      const source = inv.customer?.source ?? 'UNKNOWN';
      const existing = map.get(source) ?? { count: 0, revenue: 0 };
      existing.count += 1;
      existing.revenue += inv.total.toNumber();
      map.set(source, existing);
    }
    return Array.from(map.entries()).map(([source, v]) => ({
      source,
      invoiceCount: v.count,
      revenue: v.revenue,
    }));
  }
}

export const analyticsService = new AnalyticsService();
