import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';

export interface DateRangeFilter {
  fromDate?: string;
  toDate?: string;
  groupBy?: 'day' | 'week' | 'month';
}

export interface ReportOptions {
  fromDate?: Date;
  toDate?: Date;
  groupBy?: 'day' | 'week' | 'month';
}

/**
 * Parse query-string date range and grouping options into a standard object.
 */
function parseDateRange(query: DateRangeFilter): ReportOptions {
  const opts: ReportOptions = {};

  if (query.fromDate) {
    opts.fromDate = new Date(query.fromDate);
  }
  if (query.toDate) {
    opts.toDate = new Date(query.toDate);
    // Include the entire end day
    opts.toDate.setHours(23, 59, 59, 999);
  }
  opts.groupBy = query.groupBy ?? 'month';

  return opts;
}

/**
 * Build a Prisma date filter from the parsed options.
 */
function dateFilter(opts: ReportOptions): Prisma.DateTimeFilter {
  const filter: Prisma.DateTimeFilter = {};
  if (opts.fromDate) filter.gte = opts.fromDate;
  if (opts.toDate) filter.lte = opts.toDate;
  return filter;
}

/**
 * Format a date into a label string based on the grouping.
 */
function formatLabel(date: Date, groupBy: 'day' | 'week' | 'month'): string {
  if (groupBy === 'day') {
    return date.toISOString().slice(0, 10); // YYYY-MM-DD
  }
  if (groupBy === 'week') {
    const year = date.getFullYear();
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay()); // Sunday start
    return `${year}-W${String(Math.ceil((start.getDate() + 1) / 7)).padStart(2, '0')}`;
  }
  return date.toISOString().slice(0, 7); // YYYY-MM
}

/**
 * Bucket a date into the start of its group period.
 */
function bucketStart(date: Date, groupBy: 'day' | 'week' | 'month'): Date {
  const d = new Date(date);
  if (groupBy === 'day') {
    d.setHours(0, 0, 0, 0);
  } else if (groupBy === 'week') {
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
  } else {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
  }
  return d;
}

export class ReportsService {
  // -----------------------------------------------------------------------
  // REVENUE REPORT
  // -----------------------------------------------------------------------
  async getRevenueReport(query: DateRangeFilter) {
    const opts = parseDateRange(query);
    const filter = dateFilter(opts);

    const invoices = await prisma.invoice.findMany({
      where: {
        invoiceDate: filter,
        status: { notIn: ['CANCELLED', 'DRAFT'] },
        deletedAt: null,
      },
      select: {
        total: true,
        paidAmount: true,
        invoiceDate: true,
      },
      orderBy: { invoiceDate: 'asc' },
    });

    // Group by period
    const buckets = new Map<string, { revenue: number; paid: number; count: number }>();

    for (const inv of invoices) {
      const key = formatLabel(inv.invoiceDate, opts.groupBy!);
      const existing = buckets.get(key) ?? { revenue: 0, paid: 0, count: 0 };
      existing.revenue += inv.total.toNumber();
      existing.paid += inv.paidAmount.toNumber();
      existing.count += 1;
      buckets.set(key, existing);
    }

    const chartData = Array.from(buckets.entries()).map(([label, v]) => ({
      label,
      value: v.revenue,
      paid: v.paid,
      count: v.count,
    }));

    const totalRevenue = chartData.reduce((sum, d) => sum + d.value, 0);
    const totalPaid = chartData.reduce((sum, d) => sum + d.paid, 0);
    const invoiceCount = invoices.length;

    return {
      summary: { totalRevenue, totalPaid, invoiceCount },
      chartData,
    };
  }

  // -----------------------------------------------------------------------
  // EXPENSE REPORT
  // -----------------------------------------------------------------------
  async getExpenseReport(query: DateRangeFilter) {
    const opts = parseDateRange(query);
    const filter = dateFilter(opts);

    const expenses = await prisma.expense.findMany({
      where: { expenseDate: filter },
      select: {
        amount: true,
        category: true,
        expenseDate: true,
      },
      orderBy: { expenseDate: 'asc' },
    });

    // Group by category
    const byCategory = new Map<string, number>();
    // Group by period
    const byPeriod = new Map<string, number>();

    for (const exp of expenses) {
      const cat = exp.category;
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + exp.amount.toNumber());

      const periodKey = formatLabel(exp.expenseDate, opts.groupBy!);
      byPeriod.set(periodKey, (byPeriod.get(periodKey) ?? 0) + exp.amount.toNumber());
    }

    const categoryChart = Array.from(byCategory.entries()).map(([label, value]) => ({
      label,
      value,
    }));

    const trendChart = Array.from(byPeriod.entries()).map(([label, value]) => ({
      label,
      value,
    }));

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount.toNumber(), 0);

    return {
      summary: { totalExpenses, count: expenses.length },
      categoryChart,
      trendChart,
    };
  }

  // -----------------------------------------------------------------------
  // PROFIT REPORT
  // -----------------------------------------------------------------------
  async getProfitReport(query: DateRangeFilter) {
    const opts = parseDateRange(query);
    const filter = dateFilter(opts);

    const [invoices, expenses] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          invoiceDate: filter,
          status: { notIn: ['CANCELLED', 'DRAFT'] },
          deletedAt: null,
        },
        select: { total: true, invoiceDate: true },
      }),
      prisma.expense.findMany({
        where: { expenseDate: filter },
        select: { amount: true, expenseDate: true },
      }),
    ]);

    // Group both by period
    const revenueBuckets = new Map<string, number>();
    const expenseBuckets = new Map<string, number>();

    for (const inv of invoices) {
      const key = formatLabel(inv.invoiceDate, opts.groupBy!);
      revenueBuckets.set(key, (revenueBuckets.get(key) ?? 0) + inv.total.toNumber());
    }

    for (const exp of expenses) {
      const key = formatLabel(exp.expenseDate, opts.groupBy!);
      expenseBuckets.set(key, (expenseBuckets.get(key) ?? 0) + exp.amount.toNumber());
    }

    const allKeys = new Set([...revenueBuckets.keys(), ...expenseBuckets.keys()]);
    const sortedKeys = Array.from(allKeys).sort();

    const chartData = sortedKeys.map((label) => {
      const revenue = revenueBuckets.get(label) ?? 0;
      const expensesVal = expenseBuckets.get(label) ?? 0;
      return {
        label,
        revenue,
        expenses: expensesVal,
        profit: revenue - expensesVal,
      };
    });

    const totalRevenue = invoices.reduce((s, i) => s + i.total.toNumber(), 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount.toNumber(), 0);

    return {
      summary: {
        totalRevenue,
        totalExpenses,
        totalProfit: totalRevenue - totalExpenses,
        profitMargin: totalRevenue > 0
          ? Number((((totalRevenue - totalExpenses) / totalRevenue) * 100).toFixed(2))
          : 0,
      },
      chartData,
    };
  }

  // -----------------------------------------------------------------------
  // BOOKING REPORT
  // -----------------------------------------------------------------------
  async getBookingReport(query: DateRangeFilter) {
    const opts = parseDateRange(query);
    const filter = dateFilter(opts);

    const bookings = await prisma.booking.findMany({
      where: {
        createdAt: filter,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
        total: true,
        paidAmount: true,
        remainingAmount: true,
        createdAt: true,
        services: { include: { service: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // By status
    const byStatus = new Map<string, { count: number; value: number }>();
    // By service
    const byService = new Map<string, { count: number; value: number }>();
    // By period
    const byPeriod = new Map<string, { count: number; value: number }>();

    for (const b of bookings) {
      // Status
      const sExisting = byStatus.get(b.status) ?? { count: 0, value: 0 };
      sExisting.count += 1;
      sExisting.value += b.total.toNumber();
      byStatus.set(b.status, sExisting);

      // Service
      for (const bs of b.services) {
        const serviceName = bs.service.name;
        const svExisting = byService.get(serviceName) ?? { count: 0, value: 0 };
        svExisting.count += 1;
        svExisting.value += bs.total.toNumber();
        byService.set(serviceName, svExisting);
      }

      // Period
      const periodKey = formatLabel(b.createdAt, opts.groupBy!);
      const pExisting = byPeriod.get(periodKey) ?? { count: 0, value: 0 };
      pExisting.count += 1;
      pExisting.value += b.total.toNumber();
      byPeriod.set(periodKey, pExisting);
    }

    const totalValue = bookings.reduce((s, b) => s + b.total.toNumber(), 0);

    return {
      summary: {
        totalBookings: bookings.length,
        totalValue,
        totalPaid: bookings.reduce((s, b) => s + b.paidAmount.toNumber(), 0),
        totalRemaining: bookings.reduce((s, b) => s + b.remainingAmount.toNumber(), 0),
      },
      statusChart: Array.from(byStatus.entries()).map(([label, v]) => ({
        label,
        value: v.count,
        totalValue: v.value,
      })),
      serviceChart: Array.from(byService.entries()).map(([label, v]) => ({
        label,
        value: v.count,
        totalValue: v.value,
      })),
      trendChart: Array.from(byPeriod.entries()).map(([label, v]) => ({
        label,
        value: v.count,
        totalValue: v.value,
      })),
    };
  }

  // -----------------------------------------------------------------------
  // CUSTOMER REPORT
  // -----------------------------------------------------------------------
  async getCustomerReport(query: DateRangeFilter) {
    const opts = parseDateRange(query);
    const filter = dateFilter(opts);

    // New customers in date range
    const newCustomers = await prisma.customer.findMany({
      where: {
        createdAt: filter,
        deletedAt: null,
      },
      select: {
        id: true,
        fullName: true,
        source: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // By source
    const bySource = new Map<string, number>();
    for (const c of newCustomers) {
      bySource.set(c.source, (bySource.get(c.source) ?? 0) + 1);
    }

    // By period
    const byPeriod = new Map<string, number>();
    for (const c of newCustomers) {
      const key = formatLabel(c.createdAt, opts.groupBy!);
      byPeriod.set(key, (byPeriod.get(key) ?? 0) + 1);
    }

    // Top customers by total spending (all time)
    const topCustomers = await prisma.customer.findMany({
      where: { deletedAt: null },
      include: {
        invoices: {
          where: { status: { notIn: ['CANCELLED', 'DRAFT'] }, deletedAt: null },
          select: { total: true },
        },
      },
    });

    const topWithSpending = topCustomers
      .map((c) => ({
        id: c.id,
        fullName: c.fullName,
        totalSpending: c.invoices.reduce((s, i) => s + i.total.toNumber(), 0),
        invoiceCount: c.invoices.length,
      }))
      .sort((a, b) => b.totalSpending - a.totalSpending)
      .slice(0, 10);

    return {
      summary: {
        newCustomers: newCustomers.length,
        totalCustomers: await prisma.customer.count({ where: { deletedAt: null } }),
      },
      sourceChart: Array.from(bySource.entries()).map(([label, value]) => ({ label, value })),
      trendChart: Array.from(byPeriod.entries()).map(([label, value]) => ({ label, value })),
      topCustomers: topWithSpending,
    };
  }

  // -----------------------------------------------------------------------
  // EQUIPMENT REPORT
  // -----------------------------------------------------------------------
  async getEquipmentReport(query: DateRangeFilter) {
    const opts = parseDateRange(query);
    const filter = dateFilter(opts);

    const equipment = await prisma.equipment.findMany({
      where: { deletedAt: null },
      include: {
        bookings: {
          where: {
            booking: {
              createdAt: filter,
              deletedAt: null,
            },
          },
          include: { booking: true },
        },
      },
    });

    const equipmentReport = equipment.map((eq) => {
      const bookings = eq.bookings;
      const totalRevenue = bookings.reduce((s, b) => s + b.totalRevenue.toNumber(), 0);
      const totalCost = bookings.reduce((s, b) => s + b.totalCost.toNumber(), 0);
      const utilizationCount = bookings.length;

      return {
        id: eq.id,
        equipmentCode: eq.equipmentCode,
        name: eq.name,
        category: eq.category,
        ownershipType: eq.ownershipType,
        status: eq.status,
        utilizationCount,
        totalRevenue,
        totalCost,
        profit: totalRevenue - totalCost,
      };
    });

    // Status summary
    const statusSummary = new Map<string, number>();
    for (const eq of equipment) {
      statusSummary.set(eq.status, (statusSummary.get(eq.status) ?? 0) + 1);
    }

    return {
      summary: {
        totalEquipment: equipment.length,
        statusBreakdown: Array.from(statusSummary.entries()).map(([label, value]) => ({
          label,
          value,
        })),
      },
      equipment: equipmentReport,
    };
  }

  // -----------------------------------------------------------------------
  // EQUIPMENT RENTAL (EXTERNAL) REPORT
  // -----------------------------------------------------------------------
  async getEquipmentRentalReport(query: DateRangeFilter) {
    const opts = parseDateRange(query);
    const filter = dateFilter(opts);

    const rentals = await prisma.externalRental.findMany({
      where: { rentalStart: filter },
      include: {
        supplier: true,
        booking: { select: { bookingNumber: true, customer: { select: { fullName: true } } } },
      },
      orderBy: { rentalStart: 'asc' },
    });

    const totalCost = rentals.reduce((s, r) => s + r.rentalCost.toNumber(), 0);

    // By supplier
    const bySupplier = new Map<string, { count: number; cost: number }>();
    for (const r of rentals) {
      const name = r.supplier.name;
      const existing = bySupplier.get(name) ?? { count: 0, cost: 0 };
      existing.count += 1;
      existing.cost += r.rentalCost.toNumber();
      bySupplier.set(name, existing);
    }

    // By period
    const byPeriod = new Map<string, number>();
    for (const r of rentals) {
      const key = formatLabel(r.rentalStart, opts.groupBy!);
      byPeriod.set(key, (byPeriod.get(key) ?? 0) + r.rentalCost.toNumber());
    }

    return {
      summary: {
        totalRentals: rentals.length,
        totalCost,
      },
      supplierChart: Array.from(bySupplier.entries()).map(([label, v]) => ({
        label,
        value: v.cost,
        count: v.count,
      })),
      trendChart: Array.from(byPeriod.entries()).map(([label, value]) => ({ label, value })),
      details: rentals.map((r) => ({
        id: r.id,
        equipmentName: r.equipmentName,
        supplier: r.supplier.name,
        bookingNumber: r.booking?.bookingNumber,
        customerName: r.booking?.customer?.fullName,
        quantity: r.quantity,
        rentalCost: r.rentalCost.toNumber(),
        rentalStart: r.rentalStart,
        rentalEnd: r.rentalEnd,
        status: r.status,
      })),
    };
  }

  // -----------------------------------------------------------------------
  // OUTSTANDING PAYMENTS REPORT
  // -----------------------------------------------------------------------
  async getOutstandingPaymentsReport(query: DateRangeFilter) {
    const opts = parseDateRange(query);
    const filter = dateFilter(opts);

    const invoices = await prisma.invoice.findMany({
      where: {
        invoiceDate: filter,
        status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
        deletedAt: null,
        remainingAmount: { gt: 0 },
      },
      include: {
        customer: { select: { id: true, fullName: true, phone: true } },
        booking: { select: { bookingNumber: true } },
      },
      orderBy: { invoiceDate: 'asc' },
    });

    const totalOutstanding = invoices.reduce(
      (s, inv) => s + inv.remainingAmount.toNumber(),
      0,
    );

    // By status
    const byStatus = new Map<string, number>();
    for (const inv of invoices) {
      byStatus.set(inv.status, (byStatus.get(inv.status) ?? 0) + inv.remainingAmount.toNumber());
    }

    return {
      summary: {
        totalOutstanding,
        invoiceCount: invoices.length,
      },
      statusChart: Array.from(byStatus.entries()).map(([label, value]) => ({ label, value })),
      details: invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customer.fullName,
        customerPhone: inv.customer.phone,
        bookingNumber: inv.booking?.bookingNumber,
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        total: inv.total.toNumber(),
        paidAmount: inv.paidAmount.toNumber(),
        remainingAmount: inv.remainingAmount.toNumber(),
        status: inv.status,
      })),
    };
  }

  // -----------------------------------------------------------------------
  // PAYMENT HISTORY REPORT
  // -----------------------------------------------------------------------
  async getPaymentHistoryReport(query: DateRangeFilter) {
    const opts = parseDateRange(query);
    const filter = dateFilter(opts);

    const payments = await prisma.payment.findMany({
      where: { paymentDate: filter },
      include: {
        invoice: { select: { invoiceNumber: true } },
        customer: { select: { fullName: true } },
      },
      orderBy: { paymentDate: 'asc' },
    });

    const totalReceived = payments.reduce((s, p) => s + p.amount.toNumber(), 0);

    // By method
    const byMethod = new Map<string, number>();
    for (const p of payments) {
      byMethod.set(p.paymentMethod, (byMethod.get(p.paymentMethod) ?? 0) + p.amount.toNumber());
    }

    // By period
    const byPeriod = new Map<string, number>();
    for (const p of payments) {
      const key = formatLabel(p.paymentDate, opts.groupBy!);
      byPeriod.set(key, (byPeriod.get(key) ?? 0) + p.amount.toNumber());
    }

    return {
      summary: {
        totalReceived,
        paymentCount: payments.length,
      },
      methodChart: Array.from(byMethod.entries()).map(([label, value]) => ({ label, value })),
      trendChart: Array.from(byPeriod.entries()).map(([label, value]) => ({ label, value })),
      details: payments.map((p) => ({
        id: p.id,
        invoiceNumber: p.invoice?.invoiceNumber,
        customerName: p.customer?.fullName,
        amount: p.amount.toNumber(),
        paymentMethod: p.paymentMethod,
        paymentDate: p.paymentDate,
        referenceNumber: p.referenceNumber,
      })),
    };
  }

  // -----------------------------------------------------------------------
  // SERVICE PERFORMANCE REPORT
  // -----------------------------------------------------------------------
  async getServicePerformanceReport(query: DateRangeFilter) {
    const opts = parseDateRange(query);
    const filter = dateFilter(opts);

    const bookingServices = await prisma.bookingService.findMany({
      where: {
        booking: {
          createdAt: filter,
          deletedAt: null,
        },
      },
      include: {
        service: true,
      },
    });

    const byService = new Map<
      string,
      { revenue: number; count: number; cost: number }
    >();

    for (const bs of bookingServices) {
      const name = bs.service.name;
      const existing = byService.get(name) ?? { revenue: 0, count: 0, cost: 0 };
      existing.revenue += bs.total.toNumber();
      existing.count += 1;
      existing.cost += bs.service.cost.toNumber() * bs.quantity;
      byService.set(name, existing);
    }

    const chartData = Array.from(byService.entries()).map(([label, v]) => ({
      label,
      revenue: v.revenue,
      cost: v.cost,
      profit: v.revenue - v.cost,
      count: v.count,
    }));

    chartData.sort((a, b) => b.revenue - a.revenue);

    const totalRevenue = chartData.reduce((s, d) => s + d.revenue, 0);
    const totalCost = chartData.reduce((s, d) => s + d.cost, 0);

    return {
      summary: {
        totalRevenue,
        totalCost,
        totalProfit: totalRevenue - totalCost,
        serviceCount: chartData.length,
      },
      chartData,
    };
  }

  // -----------------------------------------------------------------------
  // LEAD CONVERSION REPORT
  // -----------------------------------------------------------------------
  async getLeadConversionReport(query: DateRangeFilter) {
    const opts = parseDateRange(query);
    const filter = dateFilter(opts);

    const leads = await prisma.lead.findMany({
      where: { createdAt: filter },
      select: {
        id: true,
        status: true,
        source: true,
        interestedService: true,
        convertedAt: true,
        createdAt: true,
        budget: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const totalLeads = leads.length;
    const convertedLeads = leads.filter((l) => l.status === 'CONVERTED');
    const conversionRate = totalLeads > 0
      ? Number(((convertedLeads.length / totalLeads) * 100).toFixed(2))
      : 0;

    // By status
    const byStatus = new Map<string, number>();
    for (const l of leads) {
      byStatus.set(l.status, (byStatus.get(l.status) ?? 0) + 1);
    }

    // By source
    const bySource = new Map<string, { total: number; converted: number }>();
    for (const l of leads) {
      const existing = bySource.get(l.source) ?? { total: 0, converted: 0 };
      existing.total += 1;
      if (l.status === 'CONVERTED') existing.converted += 1;
      bySource.set(l.source, existing);
    }

    // By period
    const byPeriod = new Map<string, { total: number; converted: number }>();
    for (const l of leads) {
      const key = formatLabel(l.createdAt, opts.groupBy!);
      const existing = byPeriod.get(key) ?? { total: 0, converted: 0 };
      existing.total += 1;
      if (l.status === 'CONVERTED') existing.converted += 1;
      byPeriod.set(key, existing);
    }

    return {
      summary: {
        totalLeads,
        convertedLeads: convertedLeads.length,
        conversionRate,
        lostLeads: leads.filter((l) => l.status === 'LOST').length,
      },
      statusChart: Array.from(byStatus.entries()).map(([label, value]) => ({ label, value })),
      sourceChart: Array.from(bySource.entries()).map(([label, v]) => ({
        label,
        value: v.total,
        converted: v.converted,
        conversionRate: v.total > 0
          ? Number(((v.converted / v.total) * 100).toFixed(2))
          : 0,
      })),
      trendChart: Array.from(byPeriod.entries()).map(([label, v]) => ({
        label,
        value: v.total,
        converted: v.converted,
      })),
    };
  }

  // -----------------------------------------------------------------------
  // MARKETING CAMPAIGN REPORT
  // -----------------------------------------------------------------------
  async getMarketingReport(query: DateRangeFilter) {
    const opts = parseDateRange(query);
    const filter = dateFilter(opts);

    const campaigns = await prisma.marketingCampaign.findMany({
      where: { createdAt: filter },
      include: {
        recipients: true,
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const campaignStats = campaigns.map((c) => {
      const totalRecipients = c.recipients.length;
      const sent = c.recipients.filter((r) => r.status === 'SENT' || r.status === 'DELIVERED').length;
      const delivered = c.recipients.filter((r) => r.status === 'DELIVERED').length;
      const failed = c.recipients.filter((r) => r.status === 'FAILED').length;
      const optedOut = c.recipients.filter((r) => r.status === 'OPTED_OUT').length;

      return {
        id: c.id,
        name: c.name,
        status: c.status,
        targetSegment: c.targetSegment,
        scheduledAt: c.scheduledAt,
        createdAt: c.createdAt,
        createdBy: c.createdBy?.name,
        totalRecipients,
        sent,
        delivered,
        failed,
        optedOut,
        deliveryRate: totalRecipients > 0
          ? Number(((delivered / totalRecipients) * 100).toFixed(2))
          : 0,
      };
    });

    // Status summary
    const byStatus = new Map<string, number>();
    for (const c of campaigns) {
      byStatus.set(c.status, (byStatus.get(c.status) ?? 0) + 1);
    }

    return {
      summary: {
        totalCampaigns: campaigns.length,
        totalRecipients: campaignStats.reduce((s, c) => s + c.totalRecipients, 0),
        totalDelivered: campaignStats.reduce((s, c) => s + c.delivered, 0),
        averageDeliveryRate: campaignStats.length > 0
          ? Number((campaignStats.reduce((s, c) => s + c.deliveryRate, 0) / campaignStats.length).toFixed(2))
          : 0,
      },
      statusChart: Array.from(byStatus.entries()).map(([label, value]) => ({ label, value })),
      campaigns: campaignStats,
    };
  }
}

export const reportsService = new ReportsService();
