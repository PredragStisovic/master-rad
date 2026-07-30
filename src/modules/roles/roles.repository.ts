import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RoleEntity } from './entities/role.entity';

const roleSelect = {
  id: true,
  name: true,
} satisfies Prisma.RoleSelect;

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.RoleUncheckedCreateInput): Promise<RoleEntity> {
    return this.prisma.role.create({ data, select: roleSelect });
  }

  findMany(
    where: Prisma.RoleWhereInput,
    skip: number,
    take: number,
  ): Promise<RoleEntity[]> {
    return this.prisma.role.findMany({
      where,
      skip,
      take,
      orderBy: { id: 'asc' },
      select: roleSelect,
    });
  }

  count(where: Prisma.RoleWhereInput): Promise<number> {
    return this.prisma.role.count({ where });
  }

  findById(id: number): Promise<RoleEntity | null> {
    return this.prisma.role.findUnique({ where: { id }, select: roleSelect });
  }

  findByName(name: string): Promise<RoleEntity | null> {
    return this.prisma.role.findUnique({ where: { name }, select: roleSelect });
  }

  async findIdByName(name: string): Promise<number | null> {
    const role = await this.prisma.role.findFirst({
      where: { name },
      select: { id: true },
    });

    return role?.id ?? null;
  }

  update(
    id: number,
    data: Prisma.RoleUncheckedUpdateInput,
  ): Promise<RoleEntity> {
    return this.prisma.role.update({ where: { id }, data, select: roleSelect });
  }

  delete(id: number): Promise<RoleEntity> {
    return this.prisma.role.delete({ where: { id }, select: roleSelect });
  }

  countUsers(roleId: number): Promise<number> {
    return this.prisma.user.count({ where: { roleId } });
  }
}
