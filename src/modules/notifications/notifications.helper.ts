import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { TasksRepository } from '../tasks/tasks.repository';
import { UsersRepository } from '../users/users.repository';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationsRepository } from './notifications.repository';

@Injectable()
export class NotificationsHelper {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly tasksRepository: TasksRepository,
  ) {}

  async assertRecipientExists(userId: number): Promise<void> {
    if (!(await this.usersRepository.findById(userId))) {
      throw new BadRequestException(`User with id ${userId} not found`);
    }
  }

  async assertTaskExists(taskId: number): Promise<void> {
    if (!(await this.tasksRepository.findById(taskId))) {
      throw new BadRequestException(`Task with id ${taskId} not found`);
    }
  }

  buildWhere(
    userId: number,
    query: QueryNotificationsDto,
  ): Prisma.NotificationWhereInput {
    const where: Prisma.NotificationWhereInput = { userId };

    if (query.read !== undefined) {
      // `read_at` is both the flag and the timestamp: null means unread.
      where.readAt = query.read ? { not: null } : null;
    }

    if (query.type !== undefined) {
      where.type = query.type;
    }

    return where;
  }

  /**
   * Scoped to the recipient rather than checked after the lookup: someone
   * else's notification has to read as absent, because a 403 would itself
   * confirm that a notification with that id exists.
   */
  async getOwnNotification(
    userId: number,
    id: number,
  ): Promise<NotificationEntity> {
    const notification = await this.notificationsRepository.findById(id);

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException(`Notification with id ${id} not found`);
    }

    return notification;
  }
}
