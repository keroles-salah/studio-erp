import { prisma } from '../../config/prisma';
import {
  CreateCustomerInput,
  UpdateCustomerInput,
  ListCustomersQuery,
} from './customers.dto';
import { Prisma } from '@prisma/client';

export class CustomersService {
  /**
   * List customers with pagination, search, filtering, and sorting.
   * Soft-deleted customers are excluded.
   */
  async list(query: ListCustomersQuery) {
    const { page, limit, search, source, customerStatus, sortBy, sortOrder } =
      query;
    const effectiveStatus = customerStatus || (query as any).status;

    const where: Prisma.CustomerWhereInput = {
      deletedAt: null,
    };

    if (source) {
      where.source = source;
    }

    if (effectiveStatus) {
      where.customerStatus = effectiveStatus;
    }

    if (search) {
      const trimmed = search.trim();
      where.OR = [
        { fullName: { contains: trimmed } },
        { phone: { contains: trimmed } },
        { whatsapp: { contains: trimmed } },
        { email: { contains: trimmed } },
      ];
    }

    const orderBy: Prisma.CustomerOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [rawItems, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          fullName: true,
          phone: true,
          whatsapp: true,
          email: true,
          city: true,
          source: true,
          customerStatus: true,
          marketingOptIn: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              bookings: { where: { deletedAt: null } },
              invoices: { where: { deletedAt: null } },
            },
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    const items = rawItems.map((c) => ({
      ...c,
      totalBookings: c._count?.bookings ?? 0,
      totalInvoices: c._count?.invoices ?? 0,
    }));

    return { items, total, page, limit };
  }

  /**
   * Get a single customer's full profile including bookings, invoices,
   * payments, spending summary, communication history, and marketing history.
   */
  async getProfile(id: string) {
    const customer = await prisma.customer.findFirst({
      where: { id, deletedAt: null },
      include: {
        bookings: {
          where: { deletedAt: null },
          include: {
            event: true,
            services: {
              include: { service: true },
            },
            equipment: {
              include: { equipment: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        invoices: {
          where: { deletedAt: null },
          include: {
            items: true,
            payments: true,
          },
          orderBy: { invoiceDate: 'desc' },
        },
        payments: {
          include: {
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
              },
            },
          },
          orderBy: { paymentDate: 'desc' },
        },
        communications: {
          orderBy: { createdAt: 'desc' },
        },
        campaignRecipients: {
          include: {
            campaign: {
              select: {
                id: true,
                name: true,
                status: true,
                scheduledAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        documents: true,
        leads: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      return null;
    }

    // Calculate financial summary
    const totalSpending = customer.invoices.reduce(
      (sum, inv) => sum + inv.total.toNumber(),
      0,
    );

    const totalPaid = customer.invoices.reduce(
      (sum, inv) => sum + inv.paidAmount.toNumber(),
      0,
    );

    const outstandingBalance = totalSpending - totalPaid;

    return {
      ...customer,
      totalSpending,
      totalPaid,
      outstandingBalance,
    };
  }

  /**
   * Create a new customer.
   */
  async create(data: CreateCustomerInput, userId: string) {
    return prisma.customer.create({
      data: {
        fullName: data.fullName,
        phone: data.phone ?? null,
        whatsapp: data.whatsapp ?? null,
        email: data.email ?? null,
        address: data.address ?? null,
        city: data.city ?? null,
        notes: data.notes ?? null,
        source: data.source,
        customerStatus: data.customerStatus,
        marketingOptIn: data.marketingOptIn,
      },
    });
  }

  /**
   * Update an existing customer (soft-deleted excluded).
   */
  async update(id: string, data: UpdateCustomerInput) {
    const existing = await prisma.customer.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!existing) {
      return null;
    }

    const updateData: Prisma.CustomerUpdateInput = {};

    if (data.fullName !== undefined) updateData.fullName = data.fullName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.whatsapp !== undefined) updateData.whatsapp = data.whatsapp;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.source !== undefined) updateData.source = data.source;
    if (data.customerStatus !== undefined)
      updateData.customerStatus = data.customerStatus;
    if (data.marketingOptIn !== undefined)
      updateData.marketingOptIn = data.marketingOptIn;

    return prisma.customer.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Soft-delete a customer by setting deletedAt.
   */
  async softDelete(id: string) {
    const existing = await prisma.customer.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!existing) {
      return null;
    }

    return prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Get customer communication history.
   */
  async getCommunications(customerId: string) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null },
      select: { id: true },
    });

    if (!customer) {
      return null;
    }

    return prisma.communication.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get customer marketing campaign history.
   */
  async getMarketingHistory(customerId: string) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null },
      select: { id: true },
    });

    if (!customer) {
      return null;
    }

    return prisma.campaignRecipient.findMany({
      where: { customerId },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            message: true,
            status: true,
            scheduledAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const customersService = new CustomersService();
