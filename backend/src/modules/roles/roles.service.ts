import { prisma } from '../../config/prisma';
import { CreateRoleInput, UpdateRoleInput } from './roles.dto';
import { Prisma } from '@prisma/client';

export const rolesService = {
  async listRoles(opts: { page: number; limit: number; search?: string }) {
    const { page, limit, search } = opts;
    const skip = (page - 1) * limit;

    const where: Prisma.RoleWhereInput = {
      ...(search
        ? { name: { contains: search } }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.role.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: selectRoleFields,
      }),
      prisma.role.count({ where }),
    ]);

    return { items, total, page, limit };
  },

  async getRoleById(id: string) {
    return prisma.role.findUnique({
      where: { id },
      select: selectRoleFields,
    });
  },

  async createRole(data: CreateRoleInput) {
    return prisma.role.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        permissions: data.permissions.length
          ? { connect: data.permissions.map((p) => ({ id: p.id })) }
          : undefined,
      },
      select: selectRoleFields,
    });
  },

  async updateRole(id: string, data: UpdateRoleInput) {
    const updateData: Prisma.RoleUpdateInput = {
      name: data.name,
      description: data.description,
    };

    if (data.permissions) {
      updateData.permissions = {
        set: data.permissions.map((p) => ({ id: p.id })),
      };
    }

    return prisma.role.update({
      where: { id },
      data: updateData,
      select: selectRoleFields,
    });
  },

  async deleteRole(id: string) {
    // Check if any users are assigned to this role
    const userCount = await prisma.user.count({
      where: { roleId: id, deletedAt: null },
    });

    if (userCount > 0) {
      throw new RoleInUseError(userCount);
    }

    return prisma.role.delete({
      where: { id },
    });
  },

  async getPermissionsForRole(roleId: string) {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      select: {
        permissions: {
          select: {
            id: true,
            name: true,
            module: true,
            action: true,
          },
        },
      },
    });

    return role?.permissions ?? [];
  },

  async listPermissions() {
    return prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
      select: {
        id: true,
        name: true,
        module: true,
        action: true,
      },
    });
  },
};

const selectRoleFields = {
  id: true,
  name: true,
  description: true,
  permissions: {
    select: {
      id: true,
      name: true,
      module: true,
      action: true,
    },
  },
  createdAt: true,
  updatedAt: true,
} as const;

export class RoleInUseError extends Error {
  constructor(public userCount: number) {
    super(`Cannot delete role: ${userCount} user(s) are still assigned to it`);
    this.name = 'RoleInUseError';
  }
}
