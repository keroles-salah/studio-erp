import { prisma } from '../../config/prisma';
import { Prisma } from '@prisma/client';
import { CreateExpenseDto, UpdateExpenseDto, ListExpensesQueryDto } from './expenses.dto';

// ── List Expenses with Filters ─────────────────────────
export async function listExpenses(query: ListExpensesQueryDto) {
  const { page, limit, category, bookingId, dateFrom, dateTo, search, sortBy, sortOrder } = query;

  const where: Prisma.ExpenseWhereInput = { deletedAt: null };

  if (category) where.category = category;
  if (bookingId) where.bookingId = bookingId;

  if (dateFrom || dateTo) {
    where.expenseDate = {};
    if (dateFrom) where.expenseDate.gte = dateFrom;
    if (dateTo) where.expenseDate.lte = dateTo;
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { description: { contains: q } },
      { supplier: { contains: q } },
    ];
  }

  const allowedSortFields = [
    'expenseDate',
    'createdAt',
    'updatedAt',
    'amount',
    'category',
    'supplier',
  ];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'expenseDate';
  const orderBy: Prisma.ExpenseOrderByWithRelationInput = {
    [sortField]: sortOrder,
  };

  const [items, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            customer: { select: { id: true, fullName: true } },
          },
        },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.expense.count({ where }),
  ]);

  const [categorySummary, totalSummary] = await Promise.all([
    prisma.expense.groupBy({
      by: ['category'],
      where,
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    }),
    prisma.expense.aggregate({
      where,
      _sum: { amount: true },
    }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    summary: {
      total: Number(totalSummary._sum.amount || 0),
      byCategory: categorySummary.map((r) => ({
        category: r.category,
        total: Number(r._sum.amount || 0),
      })),
    },
  };
}

// ── Get Expense by ID ──────────────────────────────────
export async function getExpenseById(id: string) {
  const expense = await prisma.expense.findFirst({
    where: { id, deletedAt: null },
    include: {
      booking: {
        select: {
          id: true,
          bookingNumber: true,
          customer: { select: { id: true, fullName: true } },
        },
      },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
  if (!expense) {
    throw { status: 404, code: 'NOT_FOUND', message: 'Expense not found' };
  }
  return expense;
}

// ── Create Expense ─────────────────────────────────────
export async function createExpense(data: CreateExpenseDto, userId: string) {
  const { bookingId, ...rest } = data;

  const createData: Prisma.ExpenseCreateInput = {
    ...rest,
    supplier: rest.supplier || null,
    notes: rest.notes || null,
    booking: bookingId ? { connect: { id: bookingId } } : undefined,
    createdBy: { connect: { id: userId } },
  };

  return prisma.expense.create({
    data: createData,
    include: {
      booking: {
        select: {
          id: true,
          bookingNumber: true,
          customer: { select: { id: true, fullName: true } },
        },
      },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
}

// ── Update Expense ─────────────────────────────────────
export async function updateExpense(id: string, data: UpdateExpenseDto) {
  const { bookingId, ...rest } = data;

  const updateData: Prisma.ExpenseUpdateInput = { ...rest };

  if (bookingId !== undefined) {
    updateData.booking = bookingId
      ? { connect: { id: bookingId } }
      : { disconnect: true };
  }

  return prisma.expense.update({
    where: { id },
    data: updateData,
    include: {
      booking: {
        select: {
          id: true,
          bookingNumber: true,
          customer: { select: { id: true, fullName: true } },
        },
      },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
}

// ── Delete Expense ─────────────────────────────────────
export async function deleteExpense(id: string) {
  const existing = await prisma.expense.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    throw { status: 404, code: 'NOT_FOUND', message: 'Expense not found' };
  }
  return prisma.expense.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

// ── Get Expenses by Category ───────────────────────────
export async function getExpensesByCategory(dateFrom?: Date, dateTo?: Date) {
  const where: Prisma.ExpenseWhereInput = { deletedAt: null };

  if (dateFrom || dateTo) {
    where.expenseDate = {};
    if (dateFrom) where.expenseDate.gte = dateFrom;
    if (dateTo) where.expenseDate.lte = dateTo;
  }

  const results = await prisma.expense.groupBy({
    by: ['category'],
    where,
    _sum: { amount: true },
    _count: { _all: true },
    orderBy: { _sum: { amount: 'desc' } },
  });

  const totalAmount = results.reduce(
    (sum, r) => sum + Number(r._sum.amount || 0),
    0,
  );

  return {
    categories: results.map((r) => ({
      category: r.category,
      totalAmount: r._sum.amount || 0,
      count: r._count._all,
      percentage:
        totalAmount > 0
          ? Number(((Number(r._sum.amount || 0) / totalAmount) * 100).toFixed(2))
          : 0,
    })),
    totalAmount,
    totalCount: results.reduce((sum, r) => sum + r._count._all, 0),
  };
}

// ── Get Expenses by Date Range ─────────────────────────
export async function getExpensesByDateRange(dateFrom: Date, dateTo: Date) {
  const expenses = await prisma.expense.findMany({
    where: {
      expenseDate: {
        gte: dateFrom,
        lte: dateTo,
      },
    },
    orderBy: { expenseDate: 'asc' },
    include: {
      booking: {
        select: {
          id: true,
          bookingNumber: true,
        },
      },
    },
  });

  // Group by day
  const byDay: Record<string, { total: number; count: number }> = {};
  const byCategory: Record<string, { total: number; count: number }> = {};

  for (const expense of expenses) {
    const dayKey = expense.expenseDate.toISOString().split('T')[0];
    if (!byDay[dayKey]) byDay[dayKey] = { total: 0, count: 0 };
    byDay[dayKey].total += Number(expense.amount);
    byDay[dayKey].count += 1;

    const catKey = expense.category;
    if (!byCategory[catKey]) byCategory[catKey] = { total: 0, count: 0 };
    byCategory[catKey].total += Number(expense.amount);
    byCategory[catKey].count += 1;
  }

  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return {
    dateRange: { from: dateFrom, to: dateTo },
    totalAmount,
    totalCount: expenses.length,
    byDay: Object.entries(byDay).map(([date, data]) => ({
      date,
      totalAmount: Number(data.total.toFixed(2)),
      count: data.count,
    })),
    byCategory: Object.entries(byCategory).map(([category, data]) => ({
      category,
      totalAmount: Number(data.total.toFixed(2)),
      count: data.count,
      percentage:
        totalAmount > 0
          ? Number(((data.total / totalAmount) * 100).toFixed(2))
          : 0,
    })),
  };
}

// ── Get Booking Expenses ───────────────────────────────
export async function getBookingExpenses(bookingId: string) {
  const expenses = await prisma.expense.findMany({
    where: { bookingId },
    orderBy: { expenseDate: 'desc' },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });

  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const byCategory = expenses.reduce(
    (acc, e) => {
      if (!acc[e.category]) {
        acc[e.category] = { total: 0, count: 0 };
      }
      acc[e.category].total += Number(e.amount);
      acc[e.category].count += 1;
      return acc;
    },
    {} as Record<string, { total: number; count: number }>,
  );

  return {
    bookingId,
    expenses,
    totalAmount: Number(totalAmount.toFixed(2)),
    expenseCount: expenses.length,
    byCategory: Object.entries(byCategory).map(([category, data]) => ({
      category,
      totalAmount: Number(data.total.toFixed(2)),
      count: data.count,
    })),
  };
}
