import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UserEntity } from './entities/user.entity';

/**
 * Columns exposed to the outside world — deliberately omits `password`.
 */
const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  roleId: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.UserUncheckedCreateInput): Promise<UserEntity> {
    return this.prisma.user.create({ data, select: userSelect });
  }

  findMany(
    where: Prisma.UserWhereInput,
    skip: number,
    take: number,
  ): Promise<UserEntity[]> {
    return this.prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { id: 'asc' },
      select: userSelect,
    });
  }

  count(where: Prisma.UserWhereInput): Promise<number> {
    return this.prisma.user.count({ where });
  }

  findById(id: number): Promise<UserEntity | null> {
    return this.prisma.user.findUnique({ where: { id }, select: userSelect });
  }

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: userSelect,
    });
  }

  findByEmailWithPassword(
    email: string,
  ): Promise<(UserEntity & { password: string }) | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: { ...userSelect, password: true },
    });
  }

  update(
    id: number,
    data: Prisma.UserUncheckedUpdateInput,
  ): Promise<UserEntity> {
    return this.prisma.user.update({ where: { id }, data, select: userSelect });
  }

  delete(id: number): Promise<UserEntity> {
    return this.prisma.user.delete({ where: { id }, select: userSelect });
  }

  async roleExists(roleId: number): Promise<boolean> {
    const count = await this.prisma.role.count({ where: { id: roleId } });

    return count > 0;
  }
}
