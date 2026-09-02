import { prisma } from '../../config/prisma';
import { Prisma } from '@prisma/client';
import { CreateBookingInput, UpdateBookingInput, ListBookingsQuery } from './bookings.dto';

// ============================================================
// HELPERS
// ============================================================

/**
 * Generate a unique booking number in the format BK-YYYYMMDD-XXXX
 * where XXXX is a zero-padded sequence that resets daily.
 */
async function generateBookingNumber(tx?: any): Promise<string> {
  const _p = tx || prisma;
  const today = new Date();
  const dateStr = today.getFullYear().toString() + String(today.getMonth() + 1).padStart(2, '0') + String(today.getDate()).padStart(2, '0');
  const prefix = 'BK-' + dateStr + '-';
  const lastBooking = await _p.booking.findFirst({
    where: { bookingNumber: { startsWith: prefix } },
    orderBy: { bookingNumber: 'desc' },
    select: { bookingNumber: true },
  });
  let sequence = 1;
  if (lastBooking) {
    const lastSeq = parseInt(lastBooking.bookingNumber.slice(prefix.length), 10);
    if (!isNaN(lastSeq)) sequence = lastSeq + 1;
  }
  return prefix + String(sequence).padStart(4, '0');
}


/**
 * Generate a unique invoice number in the format INV-YYYYMMDD-XXXX
 */
async function generateInvoiceNumber(tx?: any): Promise<string> {
  const _p = tx || prisma;
  const today = new Date();
  const dateStr = today.getFullYear().toString() + String(today.getMonth() + 1).padStart(2, '0') + String(today.getDate()).padStart(2, '0');
  const prefix = 'INV-' + dateStr + '-';
  const lastInvoice = await _p.invoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  });
  let sequence = 1;
  if (lastInvoice) {
    const lastSeq = parseInt(lastInvoice.invoiceNumber.slice(prefix.length), 10);
    if (!isNaN(lastSeq)) sequence = lastSeq + 1;
  }
  return prefix + String(sequence).padStart(4, '0');
}


// ============================================================
// TYPES
// ============================================================

interface TotalsInput {
  services: { quantity: number; unitPrice: number; discount: number }[];
  equipment: { quantity: number; unitPrice: number; discount?: number }[];
  discount: number;
}

interface TotalsResult {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

/**
 * Calculate booking totals from services + equipment, applying discount.
 * No tax is applied to bookings.
 *
 * - subtotal = sum(service totals) + sum(equipment revenue totals)
 * - discount applied to subtotal (flat amount)
 * - total = subtotal - discount
 */
function calculateTotals(input: TotalsInput): TotalsResult {
  const servicesSubtotal = input.services.reduce((sum, s) => {
    const lineTotal = s.quantity * s.unitPrice - (s.discount || 0);
    return sum + Math.max(0, lineTotal);
  }, 0);

  const equipmentSubtotal = input.equipment.reduce((sum, e) => {
    const lineTotal = e.quantity * e.unitPrice - (e.discount || 0);
    return sum + Math.max(0, lineTotal);
  }, 0);

  const subtotal = servicesSubtotal + equipmentSubtotal;

  // Cap discount to not exceed subtotal
  const effectiveDiscount = Math.min(input.discount, subtotal);

  const total = subtotal - effectiveDiscount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(effectiveDiscount * 100) / 100,
    tax: 0,
    total: Math.round(total * 100) / 100,
  };
}


/**
 * Check if any equipment in the list is already booked on the same event date.
 * Enforces rule: An equipment cannot be booked twice on the same day.
 * Returns an array of conflict descriptions (empty array = no conflicts).
 */
async function checkEquipmentConflict(
  equipmentItems: { equipmentId: string; quantity: number }[],
  eventDate: Date,
  startTime?: Date | null,
  endTime?: Date | null,
  excludeBookingId?: string,
): Promise<string[]> {
  const conflicts: string[] = [];

  // Check duplicate equipment within the same submission
  const seenIds = new Set<string>();
  for (const item of equipmentItems) {
    if (seenIds.has(item.equipmentId)) {
      const eq = await prisma.equipment.findUnique({ where: { id: item.equipmentId }, select: { name: true, equipmentCode: true } });
      conflicts.push(`المعدة "${eq?.name || item.equipmentId}" مكررة في نفس طلب الحجز`);
    }
    seenIds.add(item.equipmentId);
  }

  // Define full day window for the target event date (UTC-safe boundary)
  const target = new Date(eventDate);
  const dayStart = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate(), 0, 0, 0, 0));
  const dayEnd = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate() + 1, 0, 0, 0, 0));

  for (const item of equipmentItems) {
    const existing = await prisma.bookingEquipment.findMany({
      where: {
        equipmentId: item.equipmentId,
        booking: {
          status: { notIn: ['CANCELLED'] },
          deletedAt: null,
          ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
          event: {
            eventDate: {
              gte: dayStart,
              lt: dayEnd,
            },
          },
        },
      },
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            status: true,
            customer: { select: { fullName: true } },
            event: { select: { eventDate: true, startTime: true, endTime: true } },
          },
        },
        equipment: { select: { id: true, name: true, equipmentCode: true } },
      },
    });

    for (const res of existing) {
      const formattedDate = target.toISOString().split('T')[0];
      conflicts.push(
        `المعدة "${res.equipment.name} (${res.equipment.equipmentCode})" محجوزة بالفعل في نفس اليوم (${formattedDate}) للحجز رقم ${res.booking.bookingNumber}${res.booking.customer?.fullName ? ` للعميل (${res.booking.customer.fullName})` : ''}. لا يمكن حجز نفس المعدة مرتين في نفس اليوم.`,
      );
    }
  }

  return conflicts;
}


/**
 * Release equipment reservations for a booking and cancel its non-final invoices.
 * Equipment is set back to AVAILABLE only if not used by another active booking.
 */
async function releaseBookingResources(
  tx: Prisma.TransactionClient,
  bookingId: string,
  equipmentItems: { equipmentId: string }[],
): Promise<void> {
  for (const eq of equipmentItems) {
    const otherActiveBookings = await tx.bookingEquipment.count({
      where: {
        equipmentId: eq.equipmentId,
        booking: {
          status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
          id: { not: bookingId },
          deletedAt: null,
        },
      },
    });

    if (otherActiveBookings === 0) {
      await tx.equipment.update({
        where: { id: eq.equipmentId },
        data: { status: 'AVAILABLE' },
      });
    }
  }

  await tx.invoice.updateMany({
    where: { bookingId, status: { notIn: ['PAID', 'CANCELLED'] } },
    data: { status: 'CANCELLED' },
  });
}

// ============================================================
// SERVICE
// ============================================================

export const bookingsService = {
  /**
   * Generate booking number (exposed for controller use)
   */
  generateBookingNumber,

  /**
   * Calculate totals (exposed for controller use)
   */
  calculateTotals,

  /**
   * Check equipment conflicts (exposed for controller use)
   */
  checkEquipmentConflict,

  // ----------------------------------------------------------
  // LIST
  // ----------------------------------------------------------

  async list(query: ListBookingsQuery) {
    const { page, limit, search, status, customerId, eventDateFrom, eventDateTo, sortBy, sortOrder } =
      query;

    const where: Prisma.BookingWhereInput = {
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (search) {
      where.OR = [
        { bookingNumber: { contains: search } },
        { customer: { fullName: { contains: search } } },
        { event: { venueName: { contains: search } } },
      ];
    }

    if (eventDateFrom || eventDateTo) {
      where.event = {
        ...(where.event as Prisma.EventWhereInput),
        eventDate: {
          ...(eventDateFrom ? { gte: eventDateFrom } : {}),
          ...(eventDateTo ? { lte: eventDateTo } : {}),
        },
      };
    }

    // Map sortBy to actual Prisma field
    const orderBy: Prisma.BookingOrderByWithRelationInput =
      sortBy === 'eventDate'
        ? { event: { eventDate: sortOrder } }
        : { [sortBy]: sortOrder };

    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          customer: {
            select: { id: true, fullName: true, phone: true, whatsapp: true, email: true },
          },
          event: true,
          _count: {
            select: {
              services: true,
              equipment: true,
              invoices: true,
              payments: true,
            },
          },
        },
      }),
    ]);

    return {
      items: bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  // ----------------------------------------------------------
  // GET BY ID
  // ----------------------------------------------------------

  async getById(id: string) {
    const booking = await prisma.booking.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { id },
          { eventId: id },
          { bookingNumber: id },
        ],
      },
      include: {
        customer: true,
        event: true,
        services: {
          include: {
            service: true,
          },
        },
        equipment: {
          include: {
            equipment: true,
          },
        },
        invoices: {
          include: {
            items: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
        expenses: {
          orderBy: { expenseDate: 'desc' },
        },
        externalRentals: {
          include: {
            supplier: true,
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!booking) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Booking not found' };
    }

    return booking;
  },

  // ----------------------------------------------------------
  // CREATE (Transactional)
  // ----------------------------------------------------------

  async createBookingTransaction(input: CreateBookingInput, userId: string) {
    const { event: eventData, services: serviceItems, equipment: equipmentItems, ...bookingFields } = input;

    const serviceNameMap = new Map<string, string>();
    const equipmentNameMap = new Map<string, string>();

    // 1. Pre-check: equipment conflicts
    if (equipmentItems.length > 0) {
      const conflicts = await checkEquipmentConflict(
        equipmentItems.map((e) => ({ equipmentId: e.equipmentId, quantity: e.quantity })),
        eventData.eventDate,
        eventData.startTime,
        eventData.endTime,
      );

      if (conflicts.length > 0) {
        throw {
          status: 409,
          code: 'EQUIPMENT_CONFLICT',
          message: 'Equipment conflict detected',
          details: conflicts,
        };
      }
    }

    // 2. Verify customer exists
    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, deletedAt: null },
    });

    if (!customer) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Customer not found' };
    }

    // 3. Verify all services exist
    if (serviceItems.length > 0) {
      const serviceIds = serviceItems.map((s) => s.serviceId);
      const foundServices = await prisma.service.findMany({
        where: { id: { in: serviceIds }, status: 'ACTIVE' },
        select: { id: true, name: true },
      });
      for (const s of foundServices) serviceNameMap.set(s.id, s.name);

      if (foundServices.length !== serviceIds.length) {
        const found = new Set(foundServices.map((s) => s.id));
        const missing = serviceIds.filter((id) => !found.has(id));
        throw {
          status: 400,
          code: 'INVALID_SERVICE',
          message: `Services not found or inactive: ${missing.join(', ')}`,
        };
      }
    }

    // 4. Verify all equipment exists
    if (equipmentItems.length > 0) {
      const equipmentIds = equipmentItems.map((e) => e.equipmentId);
      const foundEquipment = await prisma.equipment.findMany({
        where: { id: { in: equipmentIds }, deletedAt: null },
        select: { id: true, name: true, status: true },
      });
      for (const e of foundEquipment) equipmentNameMap.set(e.id, e.name);

      if (foundEquipment.length !== equipmentIds.length) {
        const found = new Set(foundEquipment.map((e) => e.id));
        const missing = equipmentIds.filter((id) => !found.has(id));
        throw {
          status: 400,
          code: 'INVALID_EQUIPMENT',
          message: `Equipment not found: ${missing.join(', ')}`,
        };
      }
    }

    // 4b. Validate equipment quantity (each equipment is a single physical unit)
    for (const eq of equipmentItems) {
      if (!Number.isInteger(eq.quantity) || eq.quantity < 1) {
        throw { status: 400, code: 'INVALID_EQUIPMENT_QUANTITY', message: 'Equipment quantity must be a positive integer' };
      }
      if (eq.quantity > 1) {
        const eqName = equipmentNameMap.get(eq.equipmentId) || eq.equipmentId;
        throw {
          status: 400,
          code: 'INSUFFICIENT_EQUIPMENT',
          message: `Cannot book more than 1 unit of "${eqName}" - only 1 unit is available`,
        };
      }
    }

    // 5. Calculate totals (no tax)
    const totals = calculateTotals({
      services: serviceItems,
      equipment: equipmentItems,
      discount: bookingFields.discount,
    });

    // 6. Execute everything in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Generate booking number inside tx
      const bookingNumber = await generateBookingNumber(tx);
      // Create event
      const event = await tx.event.create({
        data: {
          eventType: eventData.eventType,
          eventDate: eventData.eventDate,
          startTime: eventData.startTime ?? null,
          endTime: eventData.endTime ?? null,
          venueName: eventData.venueName ?? null,
          venueAddress: eventData.venueAddress ?? null,
          city: eventData.city ?? null,
          notes: eventData.notes ?? null,
        },
      });

      // Create booking
      const booking = await tx.booking.create({
        data: {
          bookingNumber,
          customerId: input.customerId,
          eventId: event.id,
          status: input.depositPaid > 0 ? 'CONFIRMED' : 'PENDING',
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          total: totals.total,
          paidAmount: input.depositPaid,
          remainingAmount: Math.max(0, totals.total - input.depositPaid),
          depositRequired: bookingFields.depositRequired,
          depositPaid: bookingFields.depositPaid,
          taxRate: 0,
          depositDate: input.depositPaid > 0 ? new Date() : null,
          notes: bookingFields.notes ?? null,
          createdById: userId,
        },
      });

      // Link event to booking
      await tx.event.update({
        where: { id: event.id },
        data: { bookingId: booking.id },
      });

      // Create booking services
      if (serviceItems.length > 0) {
        await tx.bookingService.createMany({
          data: serviceItems.map((s) => ({
            bookingId: booking.id,
            serviceId: s.serviceId,
            quantity: s.quantity,
            unitPrice: s.unitPrice,
            discount: s.discount,
            total: Math.max(0, s.quantity * s.unitPrice - s.discount),
            notes: s.notes ?? null,
          })),
        });
      }

      // Create booking equipment + update equipment status
      if (equipmentItems.length > 0) {
        for (const eq of equipmentItems) {
          const totalRevenue = Math.max(0, eq.quantity * eq.unitPrice);
          const totalCost = eq.quantity * eq.rentalCost;

          await tx.bookingEquipment.create({
            data: {
              bookingId: booking.id,
              equipmentId: eq.equipmentId,
              quantity: eq.quantity,
              unitPrice: eq.unitPrice,
              rentalCost: eq.rentalCost,
              totalRevenue,
              totalCost,
              notes: eq.notes ?? null,
            },
          });

          // Update equipment status to RESERVED
          await tx.equipment.update({
            where: { id: eq.equipmentId },
            data: { status: 'RESERVED' },
          });
        }
      }

      // Create invoice
      const invoiceNumber = await generateInvoiceNumber(tx);

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId: input.customerId,
          bookingId: booking.id,
          invoiceDate: new Date(),
          dueDate: bookingFields.depositRequired > 0 ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null,
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          total: totals.total,
          paidAmount: input.depositPaid,
          remainingAmount: Math.max(0, totals.total - input.depositPaid),
          status: input.depositPaid >= totals.total ? 'PAID' : input.depositPaid > 0 ? 'PARTIALLY_PAID' : 'DRAFT',
          createdById: userId,
        },
      });

      // Create invoice items from services
      if (serviceItems.length > 0) {
        await tx.invoiceItem.createMany({
          data: serviceItems.map((s) => ({
            invoiceId: invoice.id,
            description: `Service: ${serviceNameMap.get(s.serviceId) ?? s.serviceId}`,
            itemType: 'SERVICE' as const,
            referenceId: s.serviceId,
            quantity: s.quantity,
            unitPrice: s.unitPrice,
            discount: s.discount,
            total: Math.max(0, s.quantity * s.unitPrice - s.discount),
          })),
        });
      }

      // Create invoice items from equipment
      if (equipmentItems.length > 0) {
        await tx.invoiceItem.createMany({
          data: equipmentItems.map((e) => ({
            invoiceId: invoice.id,
            description: equipmentNameMap.get(e.equipmentId) ?? e.equipmentId,
            itemType: 'EQUIPMENT' as const,
            referenceId: e.equipmentId,
            quantity: e.quantity,
            unitPrice: e.unitPrice,
            discount: 0,
            total: Math.max(0, e.quantity * e.unitPrice),
          })),
        });
      }

      // Record deposit payment if applicable
      if (input.depositPaid > 0) {
        await tx.payment.create({
          data: {
            invoiceId: invoice.id,
            bookingId: booking.id,
            customerId: input.customerId,
            amount: input.depositPaid,
            paymentMethod: input.depositPaymentMethod ?? 'CASH',
            paymentDate: new Date(),
            notes: 'Deposit payment',
            receivedById: userId,
          },
        });
      }

      // Return the full booking with relations
      return tx.booking.findUnique({
        where: { id: booking.id },
        include: {
          customer: { select: { id: true, fullName: true, phone: true, email: true } },
          event: true,
          services: { include: { service: true } },
          equipment: { include: { equipment: true } },
          invoices: { include: { items: true } },
          payments: true,
          createdBy: { select: { id: true, name: true, email: true } },
        },
      });
    });

    return result;
  },

  // ----------------------------------------------------------
  // UPDATE
  // ----------------------------------------------------------

  async update(id: string, input: UpdateBookingInput, userId: string) {
    const existing = await prisma.booking.findFirst({
      where: { id, deletedAt: null },
      include: {
        services: true,
        equipment: true,
        event: true,
      },
    });

    if (!existing) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Booking not found' };
    }

    if (existing.status === 'CANCELLED') {
      throw { status: 400, code: 'BAD_REQUEST', message: 'Cannot update a cancelled booking' };
    }

    // Recalculate totals if relevant fields changed
    let totals: { subtotal: number; discount: number; tax: number; total: number } | undefined;

    if (input.discount !== undefined || input.event !== undefined) {
      const servicesForCalc = existing.services.map((s) => ({
        quantity: s.quantity,
        unitPrice: Number(s.unitPrice),
        discount: Number(s.discount),
      }));

      const equipmentForCalc = existing.equipment.map((e) => ({
        quantity: e.quantity,
        unitPrice: Number(e.unitPrice),
      }));

      totals = calculateTotals({
        services: servicesForCalc,
        equipment: equipmentForCalc,
        discount: input.discount ?? Number(existing.discount),
      });
    }

    // Update event if provided
    if (input.event) {
      if (existing.eventId) {
        await prisma.event.update({
          where: { id: existing.eventId },
          data: {
            eventType: input.event.eventType,
            eventDate: input.event.eventDate,
            startTime: input.event.startTime,
            endTime: input.event.endTime,
            venueName: input.event.venueName,
            venueAddress: input.event.venueAddress,
            city: input.event.city,
            notes: input.event.notes,
          },
        });
      }

      // Re-check equipment conflicts if event date/time changed
      if (input.event.eventDate || input.event.startTime || input.event.endTime) {
        const currentEquipment = existing.equipment.map(e => ({ equipmentId: e.equipmentId, quantity: e.quantity }));
        if (currentEquipment.length > 0) {
          const newDate = input.event.eventDate ? new Date(input.event.eventDate) : existing.event?.eventDate;
          const newStart = input.event.startTime ? new Date(input.event.startTime) : existing.event?.startTime;
          const newEnd = input.event.endTime ? new Date(input.event.endTime) : existing.event?.endTime;
          const conflicts = await checkEquipmentConflict(
            currentEquipment,
            newDate!,
            newStart,
            newEnd,
            id, // excludeBookingId
          );
          if (conflicts.length > 0) {
            throw { status: 409, code: 'EQUIPMENT_CONFLICT', message: 'Equipment conflict detected', details: conflicts };
          }
        }
      }
    }

    // Build booking update data
    const updateData: Prisma.BookingUpdateInput = {};
    if (input.status) updateData.status = input.status;
    if (input.customerId) updateData.customer = { connect: { id: input.customerId } };
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.depositRequired !== undefined) updateData.depositRequired = input.depositRequired;
    if (input.depositPaid !== undefined) updateData.depositPaid = input.depositPaid;
    if (input.depositDate !== undefined) updateData.depositDate = input.depositDate;
    if (input.nextPaymentDate !== undefined) updateData.nextPaymentDate = input.nextPaymentDate;
    if (input.discount !== undefined) updateData.discount = input.discount;

    if (totals) {
      updateData.subtotal = totals.subtotal;
      updateData.tax = totals.tax;
      updateData.total = totals.total;
      updateData.discount = totals.discount;
      updateData.remainingAmount = Math.max(0, totals.total - Number(existing.paidAmount));
    }

    // Sync linked non-final invoices with the new totals (paidAmount stays intact)
    if (totals) {
      const linkedInvoices = await prisma.invoice.findMany({
        where: { bookingId: id, status: { notIn: ['PAID', 'CANCELLED'] }, deletedAt: null },
        select: { id: true, paidAmount: true, status: true },
      });

      for (const inv of linkedInvoices) {
        const paid = inv.paidAmount.toNumber();
        const newRemaining = Math.max(0, totals.total - paid);
        const newStatus =
          paid >= totals.total
            ? 'PAID'
            : paid > 0
              ? 'PARTIALLY_PAID'
              : inv.status === 'DRAFT'
                ? 'DRAFT'
                : 'SENT';

        await prisma.invoice.update({
          where: { id: inv.id },
          data: {
            subtotal: totals.subtotal,
            discount: totals.discount,
            tax: totals.tax,
            total: totals.total,
            remainingAmount: newRemaining,
            ...(newStatus !== inv.status ? { status: newStatus } : {}),
          },
        });
      }
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        customer: { select: { id: true, fullName: true, phone: true, email: true } },
        event: true,
        services: { include: { service: true } },
        equipment: { include: { equipment: true } },
        invoices: { include: { items: true } },
        payments: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return updated;
  },

  // ----------------------------------------------------------
  // SOFT DELETE
  // ----------------------------------------------------------

  async softDelete(id: string) {
    const booking = await prisma.booking.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, status: true, equipment: { select: { equipmentId: true } } },
    });

    if (!booking) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Booking not found' };
    }

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id },
        data: { deletedAt: new Date(), status: 'CANCELLED' },
      });

      await releaseBookingResources(tx, id, booking.equipment);
    });

    return { id };
  },

  // ----------------------------------------------------------
  // CANCEL BOOKING
  // ----------------------------------------------------------

  async cancelBooking(id: string) {
    const booking = await prisma.booking.findFirst({
      where: { id, deletedAt: null },
      include: {
        equipment: { select: { equipmentId: true } },
      },
    });

    if (!booking) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Booking not found' };
    }

    if (booking.status === 'CANCELLED') {
      throw { status: 400, code: 'BAD_REQUEST', message: 'Booking is already cancelled' };
    }

    // Transactional: cancel booking, release equipment, cancel invoices
    await prisma.$transaction(async (tx) => {
      // Update booking status
      await tx.booking.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      // Release equipment reservations + cancel associated invoices
      await releaseBookingResources(tx, id, booking.equipment);
    });

    return { id, status: 'CANCELLED' };
  },
};
