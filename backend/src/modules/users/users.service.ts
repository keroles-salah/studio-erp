import { prisma } from '../../config/prisma';
import bcrypt from 'bcryptjs';
import { CreateUserInput, UpdateUserInput } from './users.dto';

const SALT_ROUNDS = 10;

export const usersService = {
  async listUsers(opts: { page: number; limit: number; search?: string }) {
    const { page, limit, search } = opts;
    const skip = (page - 1) * limit;

    const where = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: selectUserFields,
      }),
      prisma.user.count({ where }),
    ]);

    return { items, total, page, limit };
  },

  async getUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: selectUserFields,
    });
  },

  async getUserWithRole(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        ...selectUserFields,
        role: {
          select: {
            name: true,
            description: true,
            permissions: {
              select: { id: true, name: true, module: true, action: true },
            },
          },
        },
      },
    });
  },

  async createUser(data: CreateUserInput) {
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        passwordHash,
        status: data.status,
        avatar: data.avatar ?? null,
        role: { connect: { id: data.roleId } },
      },
      select: selectUserFields,
    });

    return user;
  },

  async updateUser(id: string, data: UpdateUserInput) {
    const updateData: Record<string, unknown> = { ...data };

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
      delete updateData.password;
    }

    return prisma.user.update({
      where: { id },
      data: updateData,
      select: selectUserFields,
    });
  },

  async softDeleteUser(id: string) {
    return prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
    });
  },

  async updateLastLogin(id: string) {
    return prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  },
};

const selectUserFields = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: { select: { id: true, name: true } },
  status: true,
  lastLoginAt: true,
  avatar: true,
  createdAt: true,
  updatedAt: true,
} as const;

