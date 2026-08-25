import { prisma } from '../../config/prisma';
import { Prisma } from '@prisma/client';
import {
  CreateInvoiceInput,
  UpdateInvoiceInput,
  ListInvoicesQuery,
} from './invoices.dto';

export class InvoicesService {
  // ─── Generate sequential invoice number: INV-YYYYMMDD-XXXX ─

  async generateInvoiceNumber(): Promise<string> {
    const today = new Date();
    const datePart =
      today.getFullYear().toString() +
      String(today.getMonth() + 1).padStart(2, '0') +
      String(today.getDate()).padStart(2, '0');

    const prefix = `INV-${datePart}-`;

    // Find the highest sequence number for today
    const lastInvoice = await prisma.invoice.findFirst({
      where: {
        invoiceNumber: { startsWith: prefix },
      },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });

    let sequence = 1;
    if (lastInvoice) {
      const lastSeq = parseInt(lastInvoice.invoiceNumber.slice(prefix.length), 10);
      if (!isNaN(lastSeq)) {
        sequence = lastSeq + 1;
      }
    }

    return `${prefix}${String(sequence).padStart(4, '0')}`;
  }


  // ── Read studio tax settings (single source of truth) ──
  private async getTaxConfig(): Promise<{ enabled: boolean; rate: number }> {
    const keys = ['studio.tax_rate', 'studio.tax_enabled'];
    const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;
    const enabled = map['studio.tax_enabled'] !== 'false'; // default true
    const rate = map['studio.tax_rate'] === undefined ? 0 : Number(map['studio.tax_rate']);
    return { enabled, rate: Number.isFinite(rate) && rate > 0 ? rate : 0 };
  }

  // ─── Calculate invoice totals from items ───────────────────

  calculateInvoiceTotals(
    items: { quantity: number; unitPrice: number; discount: number; total: number }[],
    discount: number = 0,
    taxRate: number = 0,
  ): { subtotal: number; discount: number; tax: number; total: number } {
    const subtotal = items.reduce((sum, item) => {
      const itemTotal = item.total || (item.quantity * item.unitPrice - item.discount);
      return sum + itemTotal;
    }, 0);

    const discountedSubtotal = subtotal - discount;
    const tax = discountedSubtotal * (taxRate / 100);
    const total = discountedSubtotal + tax;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  }

  // ─── Determine invoice status based on paid amount ─────────

  private determineInvoiceStatus(
    total: number,
    paidAmount: number,
    currentStatus: string,
  ): string {
    // Don't auto-change CANCELLED invoices
    if (currentStatus === 'CANCELLED') return currentStatus;

    if (paidAmount <= 0) {
      // Keep as DRAFT or SENT, don't downgrade
      return ['DRAFT', 'SENT'].includes(currentStatus) ? currentStatus : 'SENT';
    }

    if (paidAmount >= total) {
      return 'PAID';
    }

    return 'PARTIALLY_PAID';
  }

  // ─── Record a payment against an invoice ───────────────────

  async recordPayment(
    tx: Prisma.TransactionClient,
    invoiceId: string,
    paymentAmount: number,
  ): Promise<void> {
    const invoice = await tx.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
      select: { id: true, total: true, paidAmount: true, status: true },
    });

    const newPaidAmount = invoice.paidAmount.toNumber() + paymentAmount;
    const total = invoice.total.toNumber();
    const newRemainingAmount = Math.max(0, total - newPaidAmount);
    const newStatus = this.determineInvoiceStatus(total, newPaidAmount, invoice.status);

    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        status: newStatus,
      },
    });
  }

  // ─── Check and mark overdue invoices ───────────────────────

  async checkOverdueInvoices(): Promise<number> {
    const now = new Date();

    const result = await prisma.invoice.updateMany({
      where: {
        deletedAt: null,
        dueDate: { lt: now },
        status: { in: ['SENT', 'PARTIALLY_PAID'] },
        remainingAmount: { gt: 0 },
      },
      data: { status: 'OVERDUE' },
    });

    return result.count;
  }

  // ─── List invoices with filters ────────────────────────────

  async list(query: ListInvoicesQuery) {
    const {
      page,
      limit,
      search,
      status,
      customerId,
      bookingId,
      overdue,
      sortBy,
      sortOrder,
    } = query;

    const where: Prisma.InvoiceWhereInput = {
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (bookingId) {
      where.bookingId = bookingId;
    }

    if (overdue) {
      where.status = 'OVERDUE';
    }

    if (search) {
      const trimmed = search.trim();
      where.OR = [
        { invoiceNumber: { contains: trimmed } },
        {
          customer: {
            fullName: { contains: trimmed },
          },
        },
      ];
    }

    const orderBy: Prisma.InvoiceOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [items, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          customer: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              email: true,
            },
          },
          booking: {
            select: {
              id: true,
              bookingNumber: true,
            },
          },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  // ─── Get single invoice with items and payments ────────────

  async getById(id: string) {
    const invoice = await prisma.invoice.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: true,
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            event: {
              select: {
                eventType: true,
                eventDate: true,
              },
            },
          },
        },
        items: {
          orderBy: { createdAt: 'asc' },
        },
        payments: {
          include: {
            receivedBy: {
              select: { id: true, name: true },
            },
          },
          orderBy: { paymentDate: 'desc' },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    return invoice;
  }

  // ─── Create invoice ────────────────────────────────────────

  async create(data: CreateInvoiceInput, userId: string) {
    const invoiceNumber = await this.generateInvoiceNumber();

    // Recompute totals server-side from line items (never trust client totals)
    const computedSubtotal = data.items.reduce(
      (sum, item) => sum + Math.max(0, item.quantity * item.unitPrice - item.discount),
      0,
    );
    const computedDiscount = Math.min(data.discount, computedSubtotal);

    // Tax always from studio settings, never from the client payload
    const taxConfig = await this.getTaxConfig();
    const effectiveTaxRate = taxConfig.enabled ? taxConfig.rate : 0;
    const computedTax =
      Math.round((computedSubtotal - computedDiscount) * (effectiveTaxRate / 100) * 100) / 100;
    const computedTotal = Math.round((computedSubtotal - computedDiscount + computedTax) * 100) / 100;

    // Over-billing guard: sum of non-cancelled invoices for a linked booking
    // must not exceed the booking total.
    if (data.bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: data.bookingId },
        select: { id: true, total: true, deletedAt: true },
      });
      if (booking && !booking.deletedAt) {
        const existing = await prisma.invoice.aggregate({
          where: {
            bookingId: data.bookingId,
            status: { not: 'CANCELLED' },
            deletedAt: null,
          },
          _sum: { total: true },
        });
        const existingTotal = Number(existing._sum.total || 0);
        if (existingTotal + computedTotal > booking.total.toNumber() + 0.01) {
          throw {
            status: 400,
            code: 'INVOICE_EXCEEDS_BOOKING',
            message: `Invoice total (${computedTotal}) exceeds remaining bookable amount for this booking (${Math.max(0, booking.total.toNumber() - existingTotal).toFixed(2)} remaining).`,
          };
        }
      }
    }

    return prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId: data.customerId,
        bookingId: data.bookingId ?? null,
        invoiceDate: data.invoiceDate,
        dueDate: data.dueDate ?? null,
        subtotal: Math.round(computedSubtotal * 100) / 100,
        discount: Math.round(computedDiscount * 100) / 100,
        tax: Math.round(computedTax * 100) / 100,
        total: computedTotal,
        paidAmount: 0,
        remainingAmount: computedTotal,
        status: 'DRAFT',
        notes: data.notes ?? null,
        createdById: userId,
        items: {
          create: data.items.map((item) => ({
            description: item.description,
            itemType: item.itemType,
            referenceId: item.referenceId ?? null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            total: item.total,
          })),
        },
      },
      include: {
        items: true,
        customer: {
          select: { id: true, fullName: true, phone: true, email: true },
        },
      },
    });
  }

  // ─── Update invoice ────────────────────────────────────────

  async update(id: string, data: UpdateInvoiceInput) {
    const existing = await prisma.invoice.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!existing) {
      return null;
    }

    const updateData: Prisma.InvoiceUpdateInput = {};

    if (data.customerId !== undefined) {
      updateData.customer = { connect: { id: data.customerId } };
    }
    if (data.bookingId !== undefined) {
      updateData.booking = data.bookingId
        ? { connect: { id: data.bookingId } }
        : { disconnect: true };
    }
    if (data.invoiceDate !== undefined) updateData.invoiceDate = data.invoiceDate;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;

    // Financial fields: keep existing values unless the client provides a
    // discount change, in which case tax is recomputed from studio settings.
    if (data.discount !== undefined) {
      const current = await prisma.invoice.findUniqueOrThrow({
        where: { id },
        select: { subtotal: true, paidAmount: true },
      });
      const subtotal = current.subtotal.toNumber();
      const newDiscount = Math.min(Math.max(0, data.discount), subtotal);
      const taxConfig = await this.getTaxConfig();
      const effectiveTaxRate = taxConfig.enabled ? taxConfig.rate : 0;
      const newTax =
        Math.round((subtotal - newDiscount) * (effectiveTaxRate / 100) * 100) / 100;
      const newTotal = Math.round((subtotal - newDiscount + newTax) * 100) / 100;

      updateData.discount = newDiscount;
      updateData.tax = newTax;
      updateData.total = newTotal;
      updateData.remainingAmount = Math.max(0, newTotal - current.paidAmount.toNumber());
    }
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.pdfPath !== undefined) updateData.pdfPath = data.pdfPath;

    return prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
        customer: {
          select: { id: true, fullName: true, phone: true, email: true },
        },
      },
    });
  }

  // ─── Soft delete invoice ───────────────────────────────────

  async softDelete(id: string) {
    const existing = await prisma.invoice.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, status: true },
    });

    if (!existing) {
      return null;
    }

    // Only allow deleting draft or cancelled invoices
    if (!['DRAFT', 'CANCELLED'].includes(existing.status)) {
      throw {
        status: 400,
        code: 'BAD_REQUEST',
        message: 'Cannot delete an invoice that is not in DRAFT or CANCELLED status',
      };
    }

    return prisma.invoice.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const invoicesService = new InvoicesService();
