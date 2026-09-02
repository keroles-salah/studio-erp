import { prisma } from '../../config/prisma';
import { Prisma } from '@prisma/client';
import {
  CreateEquipmentInput,
  UpdateEquipmentInput,
  ListEquipmentQuery,
  AvailabilityQuery,
} from './equipment.dto';

export class EquipmentService {
  // ─── List with filters ──────────────────────────────────────────────

  async list(query: ListEquipmentQuery) {
    const { page, limit, search, category, status, ownershipType, sortBy, sortOrder } = query;

    const where: Prisma.EquipmentWhereInput = {
      deletedAt: null,
    };

    if (category) {
      where.category = { equals: category };
    }

    if (status) {
      where.status = status;
    }

    if (ownershipType) {
      where.ownershipType = ownershipType;
    }

    if (search) {
      const trimmed = search.trim();
      where.OR = [
        { name: { contains: trimmed } },
        { equipmentCode: { contains: trimmed } },
        { serialNumber: { contains: trimmed } },
      ];
    }

    const orderBy: Prisma.EquipmentOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [items, total] = await Promise.all([
      prisma.equipment.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        // Include the latest active booking so the UI can show
        // which event currently uses / reserved this unit.
        include: {
          bookings: {
            where: {
              booking: {
                deletedAt: null,
                status: { notIn: ['CANCELLED'] },
              },
            },
            orderBy: { booking: { updatedAt: 'desc' } },
            include: {
              booking: {
                select: {
                  id: true,
                  bookingNumber: true,
                  status: true,
                  event: {
                    select: {
                      id: true,
                      eventType: true,
                      eventDate: true,
                      startTime: true,
                      endTime: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.equipment.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  // ─── Get by ID ──────────────────────────────────────────────────────

  async getById(id: string) {
    return prisma.equipment.findFirst({
      where: { id, deletedAt: null },
      include: {
        bookings: {
          include: {
            booking: {
              select: {
                id: true,
                bookingNumber: true,
                status: true,
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
          orderBy: { booking: { createdAt: 'desc' } },
        },
      },
    });
  }

  // ─── Create ─────────────────────────────────────────────────────────

  async create(data: CreateEquipmentInput) {
    return prisma.equipment.create({
      data: {
        equipmentCode: data.equipmentCode,
        name: data.name,
        category: data.category,
        brand: data.brand ?? null,
        model: data.model ?? null,
        serialNumber: data.serialNumber ?? null,
        quantity: data.quantity ?? 1,
        ownershipType: data.ownershipType,
        purchasePrice: data.purchasePrice ?? null,
        rentalCost: data.rentalCost ?? null,
        rentalPrice: data.rentalPrice ?? null,
        status: data.status,
        location: data.location ?? null,
        notes: data.notes ?? null,
        imageUrl: data.imageUrl ?? null,
      },
    });
  }

  // ─── Update ─────────────────────────────────────────────────────────

  async update(id: string, data: UpdateEquipmentInput) {
    const existing = await prisma.equipment.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!existing) {
      return null;
    }

    const updateData: Prisma.EquipmentUpdateInput = {};

    if (data.equipmentCode !== undefined) updateData.equipmentCode = data.equipmentCode;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.brand !== undefined) updateData.brand = data.brand;
    if (data.model !== undefined) updateData.model = data.model;
    if (data.serialNumber !== undefined) updateData.serialNumber = data.serialNumber;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.ownershipType !== undefined) updateData.ownershipType = data.ownershipType;
    if (data.purchasePrice !== undefined) updateData.purchasePrice = data.purchasePrice;
    if (data.rentalCost !== undefined) updateData.rentalCost = data.rentalCost;
    if (data.rentalPrice !== undefined) updateData.rentalPrice = data.rentalPrice;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;

    return prisma.equipment.update({
      where: { id },
      data: updateData,
    });
  }

  // ─── Soft delete ────────────────────────────────────────────────────

  async softDelete(id: string) {
    const existing = await prisma.equipment.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!existing) {
      return null;
    }

    return prisma.equipment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ─── Check availability for a date range ────────────────────────────
  // Returns equipment items that overlap with the given date range
  // by looking at BookingEquipment joined with Booking + Event.

  async checkAvailability(query: AvailabilityQuery) {
    const { startDate, endDate, equipmentId } = query;

    // If a specific equipment ID is provided, check just that one.
    // Otherwise, return availability status for all non-deleted equipment.
    const equipmentWhere: Prisma.EquipmentWhereInput = {
      deletedAt: null,
      ...(equipmentId ? { id: equipmentId } : {}),
    };

    const equipmentItems = await prisma.equipment.findMany({
      where: equipmentWhere,
      select: { id: true, equipmentCode: true, name: true, status: true, quantity: true },
    });

    // Fetch active booking-equipment links that could overlap (broad net).
    // Then filter with correct overlap: existingStart < requestedEnd && requestedStart < existingEnd
    const allBookings = await prisma.bookingEquipment.findMany({
      where: {
        booking: {
          deletedAt: null,
          status: { in: ['CONFIRMED', 'IN_PROGRESS', 'PENDING'] },
          event: {
            eventDate: { lte: endDate },
          },
        },
        ...(equipmentId ? { equipmentId } : {}),
      },
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            status: true,
            event: {
              select: {
                id: true,
                eventType: true,
                eventDate: true,
                startTime: true,
                endTime: true,
              },
            },
          },
        },
        equipment: {
          select: { id: true, equipmentCode: true, name: true },
        },
      },
    });

    // Filter to only true overlaps: existingStart < requestedEnd && requestedStart < existingEnd
    const conflictingBookings = allBookings.filter((b) => {
      const evt = b.booking.event;
      if (!evt) return false;
      const existingStart = evt.startTime ?? evt.eventDate;
      const existingEnd = evt.endTime ?? new Date(evt.eventDate.getTime() + 24 * 60 * 60 * 1000);
      return existingStart < endDate && startDate < existingEnd;
    });

    // Build a map of equipmentId → conflicts
    const conflictMap = new Map<string, typeof conflictingBookings>();
    for (const cb of conflictingBookings) {
      const existing = conflictMap.get(cb.equipmentId) ?? [];
      existing.push(cb);
      conflictMap.set(cb.equipmentId, existing);
    }

    // Build the availability result (capacity-aware: stock minus booked quantity)
    const unavailableFlags = ['MAINTENANCE', 'DAMAGED', 'LOST', 'UNAVAILABLE'];
    const items = equipmentItems.map((eq) => {
      const conflicts = conflictMap.get(eq.id) ?? [];
      const totalUnits = eq.quantity;
      const bookedUnits = conflicts.reduce((sum, c) => sum + (c.quantity || 0), 0);
      const availableUnits = Math.max(0, totalUnits - bookedUnits);
      const isAvailable = !unavailableFlags.includes(eq.status) && availableUnits > 0;

      return {
        id: eq.id,
        equipmentCode: eq.equipmentCode,
        name: eq.name,
        status: eq.status,
        quantity: totalUnits,
        bookedUnits,
        availableUnits,
        isAvailable,
        conflicts: conflicts.map((c) => ({
          bookingId: c.booking.id,
          bookingNumber: c.booking.bookingNumber,
          bookingStatus: c.booking.status,
          quantity: c.quantity,
          event: c.booking.event
            ? {
                eventType: c.booking.event.eventType,
                eventDate: c.booking.event.eventDate,
                startTime: c.booking.event.startTime,
                endTime: c.booking.event.endTime,
              }
            : null,
        })),
      };
    });

    return {
      startDate,
      endDate,
      items,
      totalAvailable: items.filter((i) => i.isAvailable).length,
      totalUnavailable: items.filter((i) => !i.isAvailable).length,
    };
  }

  // ─── Equipment statistics ───────────────────────────────────────────

  async getEquipmentStats() {
    const [byStatus, byCategory, byOwnershipType, total, unitsAgg] = await Promise.all([
      prisma.equipment.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { id: true },
      }),
      prisma.equipment.groupBy({
        by: ['category'],
        where: { deletedAt: null },
        _count: { id: true },
      }),
      prisma.equipment.groupBy({
        by: ['ownershipType'],
        where: { deletedAt: null },
        _count: { id: true },
      }),
      prisma.equipment.count({ where: { deletedAt: null } }),
      prisma.equipment.aggregate({
        where: { deletedAt: null },
        _sum: { quantity: true },
      }),
    ]);

    return {
      total,
      totalUnits: unitsAgg._sum.quantity ?? 0,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
      byCategory: byCategory.map((c) => ({ category: c.category, count: c._count.id })),
      byOwnershipType: byOwnershipType.map((o) => ({
        ownershipType: o.ownershipType,
        count: o._count.id,
      })),
    };
  }

  // ─── Most profitable equipment ──────────────────────────────────────
  // Aggregates totalRevenue from BookingEquipment, sorts descending.

  async getMostProfitableEquipment(limit = 10) {
    const result = await prisma.bookingEquipment.groupBy({
      by: ['equipmentId'],
      _sum: { totalRevenue: true, totalCost: true },
      _count: { id: true },
      orderBy: { _sum: { totalRevenue: 'desc' } },
      take: limit,
    });

    const equipmentIds = result.map((r) => r.equipmentId);

    const equipmentDetails = await prisma.equipment.findMany({
      where: { id: { in: equipmentIds } },
      select: {
        id: true,
        equipmentCode: true,
        name: true,
        category: true,
        ownershipType: true,
        status: true,
      },
    });

    const detailMap = new Map(equipmentDetails.map((e) => [e.id, e]));

    return result.map((r) => {
      const detail = detailMap.get(r.equipmentId);
      const revenue = r._sum.totalRevenue?.toNumber() ?? 0;
      const cost = r._sum.totalCost?.toNumber() ?? 0;

      return {
        ...detail,
        totalRevenue: revenue,
        totalCost: cost,
        profit: revenue - cost,
        bookingCount: r._count.id,
      };
    });
  }
}

export const equipmentService = new EquipmentService();
