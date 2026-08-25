import { prisma } from '../../config/prisma';
import { Prisma } from '@prisma/client';
import {
  CreateExternalRentalInput,
  UpdateExternalRentalInput,
  ListExternalRentalsQuery,
} from './external-rentals.dto';

export class ExternalRentalsService {
  // ─── List with filters ──────────────────────────────────────────────

  async list(query: ListExternalRentalsQuery) {
    const {
      page,
      limit,
      search,
      supplierId,
      bookingId,
      status,
      sortBy,
      sortOrder,
    } = query;

    const where: Prisma.ExternalRentalWhereInput = { deletedAt: null };

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (bookingId) {
      where.bookingId = bookingId;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      const trimmed = search.trim();
      where.equipmentName = { contains: trimmed };
    }

    const orderBy: Prisma.ExternalRentalOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [items, total] = await Promise.all([
      prisma.externalRental.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              phone: true,
              whatsapp: true,
            },
          },
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              status: true,
            },
          },
        },
      }),
      prisma.externalRental.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  // ─── Get by ID ──────────────────────────────────────────────────────

  async getById(id: string) {
    return prisma.externalRental.findFirst({
      where: { id, deletedAt: null },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            phone: true,
            whatsapp: true,
            email: true,
            address: true,
          },
        },
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            status: true,
            customer: {
              select: {
                id: true,
                fullName: true,
                phone: true,
              },
            },
            event: {
              select: {
                id: true,
                eventType: true,
                eventDate: true,
              },
            },
          },
        },
      },
    });
  }

  // ─── Create ─────────────────────────────────────────────────────────

  async create(data: CreateExternalRentalInput) {
    // Verify supplier exists
    const supplier = await prisma.supplier.findUnique({
      where: { id: data.supplierId },
      select: { id: true, status: true },
    });

    if (!supplier) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Supplier not found' };
    }

    if (supplier.status === 'INACTIVE') {
      throw { status: 400, code: 'BAD_REQUEST', message: 'Supplier is inactive' };
    }

    // Verify booking exists
    const booking = await prisma.booking.findFirst({
      where: { id: data.bookingId, deletedAt: null },
      select: { id: true, status: true },
    });

    if (!booking) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Booking not found' };
    }

    if (booking.status === 'CANCELLED') {
      throw { status: 400, code: 'BAD_REQUEST', message: 'Cannot add external rental to a cancelled booking' };
    }

    return prisma.externalRental.create({
      data: {
        supplierId: data.supplierId,
        bookingId: data.bookingId,
        equipmentName: data.equipmentName,
        quantity: data.quantity,
        rentalCost: data.rentalCost,
        rentalStart: data.rentalStart,
        rentalEnd: data.rentalEnd ?? null,
        status: data.status,
        notes: data.notes ?? null,
      },
      include: {
        supplier: { select: { id: true, name: true } },
        booking: { select: { id: true, bookingNumber: true } },
      },
    });
  }

  // ─── Update ─────────────────────────────────────────────────────────

  async update(id: string, data: UpdateExternalRentalInput) {
    const existing = await prisma.externalRental.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return null;
    }

    const updateData: Prisma.ExternalRentalUpdateInput = {};

    if (data.supplierId !== undefined) {
      // Verify new supplier exists
      const supplier = await prisma.supplier.findUnique({
        where: { id: data.supplierId },
        select: { id: true, status: true },
      });
      if (!supplier) {
        throw { status: 404, code: 'NOT_FOUND', message: 'Supplier not found' };
      }
      if (supplier.status === 'INACTIVE') {
        throw { status: 400, code: 'BAD_REQUEST', message: 'Supplier is inactive' };
      }
      updateData.supplier = { connect: { id: data.supplierId } };
    }

    if (data.bookingId !== undefined) {
      const booking = await prisma.booking.findFirst({
        where: { id: data.bookingId, deletedAt: null },
        select: { id: true },
      });
      if (!booking) {
        throw { status: 404, code: 'NOT_FOUND', message: 'Booking not found' };
      }
      updateData.booking = { connect: { id: data.bookingId } };
    }

    if (data.equipmentName !== undefined) updateData.equipmentName = data.equipmentName;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.rentalCost !== undefined) updateData.rentalCost = data.rentalCost;
    if (data.rentalStart !== undefined) updateData.rentalStart = data.rentalStart;
    if (data.rentalEnd !== undefined) updateData.rentalEnd = data.rentalEnd;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;

    return prisma.externalRental.update({
      where: { id },
      data: updateData,
      include: {
        supplier: { select: { id: true, name: true } },
        booking: { select: { id: true, bookingNumber: true } },
      },
    });
  }

  // ─── Delete ─────────────────────────────────────────────────────────

  async delete(id: string) {
    const existing = await prisma.externalRental.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existing) {
      return null;
    }

    // Only allow deletion if not already returned or cancelled
    if (existing.status === 'RETURNED') {
      throw {
        status: 400,
        code: 'BAD_REQUEST',
        message: 'Cannot delete a returned external rental. Cancel it instead.',
      };
    }

    return prisma.externalRental.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ─── Calculate external rental costs for a booking ──────────────────
  // Returns the total rental cost, broken down by supplier.

  async calculateBookingRentalCosts(bookingId: string) {
    const rentals = await prisma.externalRental.findMany({
      where: {
        bookingId,
        status: { notIn: ['CANCELLED'] },
        deletedAt: null,
      },
      include: {
        supplier: {
          select: { id: true, name: true },
        },
      },
      orderBy: { rentalStart: 'asc' },
    });

    const totalCost = rentals.reduce(
      (sum, r) => sum + r.rentalCost.toNumber() * r.quantity,
      0,
    );

    // Group by supplier
    const bySupplier = new Map<string, {
      supplierId: string;
      supplierName: string;
      itemCount: number;
      totalCost: number;
      items: typeof rentals;
    }>();

    for (const rental of rentals) {
      const existing = bySupplier.get(rental.supplierId) ?? {
        supplierId: rental.supplierId,
        supplierName: rental.supplier.name,
        itemCount: 0,
        totalCost: 0,
        items: [] as typeof rentals,
      };
      existing.itemCount += 1;
      existing.totalCost += rental.rentalCost.toNumber() * rental.quantity;
      existing.items.push(rental);
      bySupplier.set(rental.supplierId, existing);
    }

    return {
      bookingId,
      totalCost,
      itemCount: rentals.length,
      bySupplier: Array.from(bySupplier.values()),
      items: rentals,
    };
  }
}

export const externalRentalsService = new ExternalRentalsService();
