import { prisma } from '../../config/prisma';
import { CreateServiceInput, UpdateServiceInput } from './services.dto';
import { Prisma } from '@prisma/client';

export const servicesService = {
  async listServices(opts: {
    page: number;
    limit: number;
    search?: string;
    category?: string;
    status?: string;
  }) {
    const { page, limit, search, category, status } = opts;
    const skip = (page - 1) * limit;

    const where: Prisma.ServiceWhereInput = {
      deletedAt: null,
      ...(search
        ? { name: { contains: search } }
        : {}),
      ...(category ? { category } : {}),
      ...(status ? { status } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.service.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.service.count({ where }),
    ]);

    return { items, total, page, limit };
  },

  async getServiceById(id: string) {
    return prisma.service.findUnique({
      where: { id },
    });
  },

  async createService(data: CreateServiceInput) {
    return prisma.service.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        category: data.category ?? null,
        basePrice: data.basePrice,
        cost: data.cost,
        taxRate: data.taxRate,
        status: data.status,
      },
    });
  },

  async updateService(id: string, data: UpdateServiceInput) {
    return prisma.service.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.basePrice !== undefined ? { basePrice: data.basePrice } : {}),
        ...(data.cost !== undefined ? { cost: data.cost } : {}),
        ...(data.taxRate !== undefined ? { taxRate: data.taxRate } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });
  },

  async softDeleteService(id: string) {
    return prisma.service.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });
  },
};
