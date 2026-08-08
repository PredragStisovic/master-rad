import { Test, TestingModule } from '@nestjs/testing';
import { NotificationType } from '../../../generated/prisma/client';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationsHelper } from './notifications.helper';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';

const notification: NotificationEntity = {
  id: 1,
  type: NotificationType.TASK_ASSIGNED,
  message: 'You were assigned to "Write the migration"',
  userId: 7,
  taskId: 5,
  readAt: null,
  createdAt: new Date('2026-01-01'),
};

const dto: CreateNotificationDto = {
  type: NotificationType.TASK_ASSIGNED,
  message: notification.message,
  userId: 7,
  taskId: 5,
};

const query = (
  overrides: Partial<QueryNotificationsDto> = {},
): QueryNotificationsDto =>
  Object.assign(new QueryNotificationsDto(), overrides);

const createRepositoryMock = () => ({
  create: jest.fn().mockResolvedValue(notification),
  findMany: jest.fn().mockResolvedValue([notification]),
  count: jest.fn().mockResolvedValue(1),
  update: jest.fn().mockResolvedValue({ ...notification, readAt: new Date() }),
});

const createHelperMock = () => ({
  assertRecipientExists: jest.fn().mockResolvedValue(undefined),
  assertTaskExists: jest.fn().mockResolvedValue(undefined),
  buildWhere: jest.fn().mockReturnValue({ userId: 7 }),
  getOwnNotification: jest.fn().mockResolvedValue(notification),
});

describe('NotificationsService', () => {
  let service: NotificationsService;
  let repository: ReturnType<typeof createRepositoryMock>;
  let helper: ReturnType<typeof createHelperMock>;

  beforeEach(async () => {
    const repositoryMock = createRepositoryMock();
    const helperMock = createHelperMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: NotificationsRepository, useValue: repositoryMock },
        { provide: NotificationsHelper, useValue: helperMock },
      ],
    }).compile();

    service = module.get(NotificationsService);
    repository = repositoryMock;
    helper = helperMock;
  });

  describe('create', () => {
    it('validates both references before inserting', async () => {
      await expect(service.create(dto)).resolves.toEqual(notification);
      expect(helper.assertRecipientExists).toHaveBeenCalledWith(7);
      expect(helper.assertTaskExists).toHaveBeenCalledWith(5);
      expect(repository.create).toHaveBeenCalledWith(dto);
    });

    it('skips the task check when the notification is not about a task', async () => {
      const taskless = { ...dto, taskId: undefined };

      await expect(service.create(taskless)).resolves.toEqual(notification);
      expect(helper.assertTaskExists).not.toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalledWith(taskless);
    });
  });

  describe('findAll', () => {
    it('pages the caller-scoped filter and reports the totals', async () => {
      const result = await service.findAll(7, query({ page: 2, limit: 10 }));

      expect(result).toEqual({
        data: [notification],
        meta: { total: 1, page: 2, limit: 10, totalPages: 1 },
      });
      expect(repository.findMany).toHaveBeenCalledWith({ userId: 7 }, 10, 10);
      expect(repository.count).toHaveBeenCalledWith({ userId: 7 });
    });

    it('counts with the same filter it pages with', async () => {
      helper.buildWhere.mockReturnValue({ userId: 7, readAt: null });

      await service.findAll(7, query({ read: false }));

      expect(repository.count).toHaveBeenCalledWith({
        userId: 7,
        readAt: null,
      });
    });
  });

  describe('markRead', () => {
    it('stamps an unread notification with the read time', async () => {
      const result = await service.markRead(7, 1);

      expect(result.readAt).toBeInstanceOf(Date);
      expect(helper.getOwnNotification).toHaveBeenCalledWith(7, 1);
      expect(repository.update).toHaveBeenCalledWith(1, {
        readAt: expect.any(Date) as unknown,
      });
    });

    it('leaves an already-read notification untouched', async () => {
      const read = { ...notification, readAt: new Date('2026-01-02') };
      helper.getOwnNotification.mockResolvedValue(read);

      await expect(service.markRead(7, 1)).resolves.toEqual(read);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });
});
