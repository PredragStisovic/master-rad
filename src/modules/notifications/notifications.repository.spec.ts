import { Test, TestingModule } from '@nestjs/testing';
import { NotificationType } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationsRepository } from './notifications.repository';

const notification: NotificationEntity = {
  id: 1,
  type: NotificationType.TASK_ASSIGNED,
  message: 'You were assigned to "Wire up the interceptor"',
  userId: 7,
  taskId: 5,
  readAt: null,
  createdAt: new Date('2026-01-01'),
};

const notificationSelect = {
  id: true,
  type: true,
  message: true,
  userId: true,
  taskId: true,
  readAt: true,
  createdAt: true,
};

const createPrismaMock = () => ({
  notification: {
    create: jest.fn().mockResolvedValue(notification),
    findMany: jest.fn().mockResolvedValue([notification]),
    count: jest.fn().mockResolvedValue(1),
    findUnique: jest.fn().mockResolvedValue(notification),
    update: jest.fn().mockResolvedValue(notification),
  },
});

describe('NotificationsRepository', () => {
  let repository: NotificationsRepository;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    const prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsRepository,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    repository = module.get(NotificationsRepository);
    prisma = prismaMock;
  });

  describe('create', () => {
    it('inserts the notification and returns the exposed columns', async () => {
      const data = {
        type: NotificationType.TASK_ASSIGNED,
        message: notification.message,
        userId: 7,
        taskId: 5,
      };

      await expect(repository.create(data)).resolves.toEqual(notification);
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data,
        select: notificationSelect,
      });
    });
  });

  describe('findMany', () => {
    it('reads a page newest first, with id breaking ties', async () => {
      const where = { userId: 7 };

      await expect(repository.findMany(where, 20, 10)).resolves.toEqual([
        notification,
      ]);
      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 20,
        take: 10,
        select: notificationSelect,
      });
    });
  });

  describe('count', () => {
    it('counts with the same filter as the page', async () => {
      const where = { userId: 7, readAt: null };

      await expect(repository.count(where)).resolves.toBe(1);
      expect(prisma.notification.count).toHaveBeenCalledWith({ where });
    });
  });

  describe('findById', () => {
    it('reads a single notification', async () => {
      await expect(repository.findById(1)).resolves.toEqual(notification);
      expect(prisma.notification.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: notificationSelect,
      });
    });
  });

  describe('update', () => {
    it('writes the patch and returns the exposed columns', async () => {
      const readAt = new Date('2026-01-02');

      await expect(repository.update(1, { readAt })).resolves.toEqual(
        notification,
      );
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { readAt },
        select: notificationSelect,
      });
    });
  });
});
