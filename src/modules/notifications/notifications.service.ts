import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationsHelper } from './notifications.helper';
import { NotificationsRepository } from './notifications.repository';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly notificationsHelper: NotificationsHelper,
  ) {}

  async create(dto: CreateNotificationDto): Promise<NotificationEntity> {
    await this.notificationsHelper.assertRecipientExists(dto.userId);

    if (dto.taskId !== undefined) {
      await this.notificationsHelper.assertTaskExists(dto.taskId);
    }

    return this.notificationsRepository.create(dto);
  }

  async findAll(
    userId: number,
    query: QueryNotificationsDto,
  ): Promise<PaginatedResult<NotificationEntity>> {
    const where = this.notificationsHelper.buildWhere(userId, query);

    const [data, total] = await Promise.all([
      this.notificationsRepository.findMany(where, query.skip, query.limit),
      this.notificationsRepository.count(where),
    ]);

    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async markRead(userId: number, id: number): Promise<NotificationEntity> {
    const notification = await this.notificationsHelper.getOwnNotification(
      userId,
      id,
    );

    // Idempotent: re-reading a notification keeps the first read time.
    if (notification.readAt) {
      return notification;
    }

    return this.notificationsRepository.update(id, { readAt: new Date() });
  }
}
