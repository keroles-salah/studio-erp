import { prisma } from '../../config/prisma';
import { Prisma } from '@prisma/client';
import { CreatePaymentInput, ListPaymentsQuery } from './payments.dto';

export class PaymentsService {
  // ─── Record a payment (transactional) ──────────────────────
  //
  // 1. Create the payment record
  // 2. Update invoice: paidAmount, remainingAmount, status
  // 3. Update booking (if linked): paidAmount, remainingAmount
  //
  async recordPayment(data: CreatePaymentInput, userId: string) {
    return prisma.$transaction(async (tx) => {
      // ── Fetch the invoice with lock-like read ──
      const invoice = await tx.invoice.findUniqueOrThrow({
        where: { id: data.invoiceId },
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
          paidAmount: true,
          remainingAmount: true,
          status: true,
          bookingId: true,
          customerId: true,
          deletedAt: true,
        },
      });

      // ── Validate invoice is not soft-deleted ──
      if (invoice.deletedAt) {
        throw {
          status: 400,
          code: 'BAD_REQUEST',
          message: 'Cannot record payment against a deleted invoice',
        };
      }

      // ── Validate invoice is not cancelled ──
      if (invoice.status === 'CANCELLED') {
        throw {
          status: 400,
          code: 'BAD_REQUEST',
          message: 'Cannot record payment against a cancelled invoice',
        };
      }

      // ── Check payment does not exceed remaining balance (with 0.01 precision tolerance) ──
      const remaining = invoice.remainingAmount.toNumber();
      if (data.amount > remaining + 0.01 && !data.overrideBalanceCheck) {
        throw {
          status: 400,
          code: 'PAYMENT_EXCEEDS_BALANCE',
          message: `Payment amount (${data.amount}) exceeds remaining balance (${remaining}). Set overrideBalanceCheck to true to override.`,
        };
      }

      // ── 1. Create payment record ──
      const payment = await tx.payment.create({
        data: {
          invoiceId: data.invoiceId,
          bookingId: data.bookingId ?? invoice.bookingId ?? null,
          customerId: data.customerId ?? invoice.customerId ?? null,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          paymentDate: data.paymentDate,
          referenceNumber: data.referenceNumber ?? null,
          notes: data.notes ?? null,
          receivedById: userId,
        },
      });

      // ── 2. Update invoice paidAmount / remainingAmount / status ──
      const newPaidAmount = invoice.paidAmount.toNumber() + data.amount;
      const total = invoice.total.toNumber();
      const newRemainingAmount = Math.max(0, total - newPaidAmount);

      let newStatus = invoice.status;
      // Don't change CANCELLED status
      if (invoice.status !== 'CANCELLED') {
        if (newPaidAmount >= total) {
          newStatus = 'PAID';
        } else if (newPaidAmount > 0) {
          newStatus = 'PARTIALLY_PAID';
        }
      }

      await tx.invoice.update({
        where: { id: data.invoiceId },
        data: {
          paidAmount: newPaidAmount,
          remainingAmount: newRemainingAmount,
          status: newStatus,
        },
      });

      // ── 3. Update booking (if linked) ──
      const bookingId = data.bookingId ?? invoice.bookingId;
      if (bookingId) {
        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
          select: {
            id: true,
            total: true,
            paidAmount: true,
            remainingAmount: true,
            deletedAt: true,
          },
        });

        if (booking && !booking.deletedAt) {
          const newBookingPaid = booking.paidAmount.toNumber() + data.amount;
          const bookingTotal = booking.total.toNumber();
          const newBookingRemaining = Math.max(0, bookingTotal - newBookingPaid);

          await tx.booking.update({
            where: { id: bookingId },
            data: {
              paidAmount: newBookingPaid,
              remainingAmount: newBookingRemaining,
            },
          });
        }
      }

      return payment;
    });
  }

  // ─── Void a payment (transactional reversal) ───────────────
  //
  // 1. Fetch payment, verify it exists
  // 2. Reverse invoice: subtract amount from paidAmount, recompute remaining & status
  // 3. Reverse booking (if linked): subtract amount from paidAmount, recompute remaining
  // 4. Delete the payment record
  //
  async voidPayment(paymentId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUniqueOrThrow({
        where: { id: paymentId },
        select: {
          id: true,
          invoiceId: true,
          bookingId: true,
          amount: true,
        },
      });

      const paymentAmount = payment.amount.toNumber();

      // ── 2. Reverse invoice ──
      const invoice = await tx.invoice.findUniqueOrThrow({
        where: { id: payment.invoiceId },
        select: {
          id: true,
          total: true,
          paidAmount: true,
          remainingAmount: true,
          status: true,
          deletedAt: true,
        },
      });

      if (!invoice.deletedAt) {
        const reversedPaidAmount = Math.max(0, invoice.paidAmount.toNumber() - paymentAmount);
        const total = invoice.total.toNumber();
        const reversedRemaining = Math.max(0, total - reversedPaidAmount);

        let reversedStatus = invoice.status;
        // Don't change CANCELLED status
        if (invoice.status !== 'CANCELLED') {
          if (reversedPaidAmount >= total) {
            reversedStatus = 'PAID';
          } else if (reversedPaidAmount > 0) {
            reversedStatus = 'PARTIALLY_PAID';
          } else {
            // No payments left — revert to SENT (or keep DRAFT if it was never sent)
            reversedStatus = invoice.status === 'DRAFT' ? 'DRAFT' : 'SENT';
          }
        }

        await tx.invoice.update({
          where: { id: payment.invoiceId },
          data: {
            paidAmount: reversedPaidAmount,
            remainingAmount: reversedRemaining,
            status: reversedStatus,
          },
        });
      }

      // ── 3. Reverse booking (if linked) ──
      if (payment.bookingId) {
        const booking = await tx.booking.findUnique({
          where: { id: payment.bookingId },
          select: {
            id: true,
            total: true,
            paidAmount: true,
            remainingAmount: true,
            deletedAt: true,
          },
        });

        if (booking && !booking.deletedAt) {
          const reversedBookingPaid = Math.max(
            0,
            booking.paidAmount.toNumber() - paymentAmount,
          );
          const bookingTotal = booking.total.toNumber();
          const reversedBookingRemaining = Math.max(0, bookingTotal - reversedBookingPaid);

          await tx.booking.update({
            where: { id: payment.bookingId },
            data: {
              paidAmount: reversedBookingPaid,
              remainingAmount: reversedBookingRemaining,
            },
          });
        }
      }

      // ── 4. Delete the payment record ──
      await tx.payment.delete({
        where: { id: paymentId },
      });
    });
  }

  // ─── List payments with filters ────────────────────────────

  async list(query: ListPaymentsQuery) {
    const {
      page,
      limit,
      invoiceId,
      bookingId,
      customerId,
      paymentMethod,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    } = query;

    const where: Prisma.PaymentWhereInput = {};

    if (invoiceId) {
      where.invoiceId = invoiceId;
    }

    if (bookingId) {
      where.bookingId = bookingId;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) {
        where.paymentDate.gte = startDate;
      }
      if (endDate) {
        where.paymentDate.lte = endDate;
      }
    }

    const orderBy: Prisma.PaymentOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [items, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              status: true,
              total: true,
            },
          },
          booking: {
            select: {
              id: true,
              bookingNumber: true,
            },
          },
          customer: {
            select: {
              id: true,
              fullName: true,
            },
          },
          receivedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  // ─── Get single payment by ID ──────────────────────────────

  async getById(id: string) {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            total: true,
            paidAmount: true,
            remainingAmount: true,
          },
        },
        booking: {
          select: {
            id: true,
            bookingNumber: true,
          },
        },
        customer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
          },
        },
        receivedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return payment;
  }
}

export const paymentsService = new PaymentsService();
