import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotificationType,
  TaskPriority,
  TaskStatus,
} from '../../../generated/prisma/client';
import { TaskEntity } from '../tasks/entities/task.entity';
import { TasksRepository } from '../tasks/tasks.repository';
import { UserEntity } from '../users/entities/user.entity';
import { UsersRepository } from '../users/users.repository';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationsHelper } from './notifications.helper';
import { NotificationsRepository } from './notifications.repository';

const user: UserEntity = {
  id: 7,
  email: 'recipient@example.com',
  firstName: 'Recipient',
  lastName: 'User',
  roleId: 1,
};

const task: TaskEntity = {
  id: 5,
  title: 'Write the migration',
  description: null,
  status: TaskStatus.TODO,
  priority: TaskPriority.MEDIUM,
  projectId: 1,
  assigneeId: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const notification: NotificationEntity = {
  id: 1,
  type: NotificationType.TASK_ASSIGNED,
  message: 'You were assigned to "Write the migration"',
  userId: 7,
  taskId: 5,
  readAt: null,
  createdAt: new Date('2026-01-01'),
};

const query = (
  overrides: Partial<QueryNotificationsDto> = {},
): QueryNotificationsDto =>
  Object.assign(new QueryNotificationsDto(), overrides);

const createNotificationsRepositoryMock = () => ({
  findById: jest.fn().mockResolvedValue(notification),
});

const createUsersRepositoryMock = () => ({
  findById: jest.fn().mockResolvedValue(user),
});

const createTasksRepositoryMock = () => ({
  findById: jest.fn().mockResolvedValue(task),
});

describe('NotificationsHelper', () => {
  let helper: NotificationsHelper;
  let notificationsRepository: ReturnType<
    typeof createNotificationsRepositoryMock
  >;
  let usersRepository: ReturnType<typeof createUsersRepositoryMock>;
  let tasksRepository: ReturnType<typeof createTasksRepositoryMock>;

  beforeEach(async () => {
    const notificationsRepositoryMock = createNotificationsRepositoryMock();
    const usersRepositoryMock = createUsersRepositoryMock();
    const tasksRepositoryMock = createTasksRepositoryMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsHelper,
        {
          provide: NotificationsRepository,
          useValue: notificationsRepositoryMock,
        },
        { provide: UsersRepository, useValue: usersRepositoryMock },
        { provide: TasksRepository, useValue: tasksRepositoryMock },
      ],
    }).compile();

    helper = module.get(NotificationsHelper);
    notificationsRepository = notificationsRepositoryMock;
    usersRepository = usersRepositoryMock;
    tasksRepository = tasksRepositoryMock;
  });

  describe('assertRecipientExists', () => {
    it('passes for a known user', async () => {
      await expect(helper.assertRecipientExists(7)).resolves.toBeUndefined();
      expect(usersRepository.findById).toHaveBeenCalledWith(7);
    });

    it('rejects an unknown recipient as a bad payload, not a missing route', async () => {
      usersRepository.findById.mockResolvedValue(null);

      await expect(helper.assertRecipientExists(404)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('assertTaskExists', () => {
    it('passes for a known task', async () => {
      await expect(helper.assertTaskExists(5)).resolves.toBeUndefined();
      expect(tasksRepository.findById).toHaveBeenCalledWith(5);
    });

    it('rejects an unknown task', async () => {
      tasksRepository.findById.mockResolvedValue(null);

      await expect(helper.assertTaskExists(404)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('buildWhere', () => {
    it('scopes to the recipient when nothing is filtered', () => {
      expect(helper.buildWhere(7, query())).toEqual({ userId: 7 });
    });

    it('reads unread as a null read_at', () => {
      expect(helper.buildWhere(7, query({ read: false }))).toEqual({
        userId: 7,
        readAt: null,
      });
    });

    it('reads read as any read_at', () => {
      expect(helper.buildWhere(7, query({ read: true }))).toEqual({
        userId: 7,
        readAt: { not: null },
      });
    });

    it('adds the type filter', () => {
      expect(
        helper.buildWhere(7, query({ type: NotificationType.TASK_COMMENTED })),
      ).toEqual({
        userId: 7,
        type: NotificationType.TASK_COMMENTED,
      });
    });
  });

  describe('getOwnNotification', () => {
    it('returns the notification addressed to the caller', async () => {
      await expect(helper.getOwnNotification(7, 1)).resolves.toEqual(
        notification,
      );
      expect(notificationsRepository.findById).toHaveBeenCalledWith(1);
    });

    it('throws when the notification does not exist', async () => {
      notificationsRepository.findById.mockResolvedValue(null);

      await expect(helper.getOwnNotification(7, 1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("hides somebody else's notification behind the same 404", async () => {
      await expect(helper.getOwnNotification(8, 1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
