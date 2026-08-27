import { prisma } from '../../config/prisma';
import { Prisma } from '@prisma/client';
import {
  CreateSupplierInput,
  UpdateSupplierInput,
  ListSuppliersQuery,
} from './suppliers.dto';

export class SuppliersService {
  // ─── List with filters ──────────────────────────────────────────────

  async list(query: ListSuppliersQuery) {
    const { page, limit, search, status, sortBy, sortOrder } = query;

    const where: Prisma.SupplierWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      const trimmed = search.trim();
      where.OR = [
        { name: { contains: trimmed } },
        { phone: { contains: trimmed } },
        { whatsapp: { contains: trimmed } },
        { email: { contains: trimmed } },
      ];
    }

    const orderBy: Prisma.SupplierOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [items, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.supplier.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  // ─── Get by ID (with external rentals) ──────────────────────────────

  async getById(id: string) {
    return prisma.supplier.findUnique({
      where: { id },
      include: {
        externalRentals: {
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
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  // ─── Create ─────────────────────────────────────────────────────────

  async create(data: CreateSupplierInput) {
    return prisma.supplier.create({
      data: {
        name: data.name,
        phone: data.phone ?? null,
        whatsapp: data.whatsapp ?? null,
        email: data.email ?? null,
        address: data.address ?? null,
        notes: data.notes ?? null,
        status: data.status,
      },
    });
  }

  // ─── Update ─────────────────────────────────────────────────────────

  async update(id: string, data: UpdateSupplierInput) {
    const existing = await prisma.supplier.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return null;
    }

    const updateData: Prisma.SupplierUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.whatsapp !== undefined) updateData.whatsapp = data.whatsapp;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.status !== undefined) updateData.status = data.status;

    return prisma.supplier.update({
      where: { id },
      data: updateData,
    });
  }

  // ─── Delete ─────────────────────────────────────────────────────────
  // Suppliers don't have soft-delete (no deletedAt field), so we hard delete.

  async delete(id: string) {
    const existing = await prisma.supplier.findUnique({
      where: { id },
      select: { id: true, _count: { select: { externalRentals: true } } },
    });

    if (!existing) {
      return null;
    }

    // Prevent deletion if supplier has active external rentals
    if (existing._count.externalRentals > 0) {
      throw {
        status: 409,
        code: 'CONFLICT',
        message: 'Cannot delete supplier with existing external rentals. Deactivate instead.',
      };
    }

    return prisma.supplier.delete({
      where: { id },
    });
  }
}

export const suppliersService = new SuppliersService();
