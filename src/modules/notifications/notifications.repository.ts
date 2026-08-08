import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationEntity } from './entities/notification.entity';

const notificationSelect = {
  id: true,
  type: true,
  message: true,
  userId: true,
  taskId: true,
  readAt: true,
  createdAt: true,
} satisfies Prisma.NotificationSelect;

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: Prisma.NotificationUncheckedCreateInput,
  ): Promise<NotificationEntity> {
    return this.prisma.notification.create({
      data,
      select: notificationSelect,
    });
  }

  findMany(
    where: Prisma.NotificationWhereInput,
    skip: number,
    take: number,
  ): Promise<NotificationEntity[]> {
    return this.prisma.notification.findMany({
      where,
      // Newest first, with `id` breaking ties so a page window stays stable.
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take,
      select: notificationSelect,
    });
  }

  count(where: Prisma.NotificationWhereInput): Promise<number> {
    return this.prisma.notification.count({ where });
  }

  findById(id: number): Promise<NotificationEntity | null> {
    return this.prisma.notification.findUnique({
      where: { id },
      select: notificationSelect,
    });
  }

  update(
    id: number,
    data: Prisma.NotificationUncheckedUpdateInput,
  ): Promise<NotificationEntity> {
    return this.prisma.notification.update({
      where: { id },
      data,
      select: notificationSelect,
    });
  }
}
