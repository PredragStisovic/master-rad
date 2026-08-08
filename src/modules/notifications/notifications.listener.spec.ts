import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationType } from '../../../generated/prisma/client';
import { TaskAssignedEvent } from '../../common/events/task-assigned.event';
import { TaskCommentedEvent } from '../../common/events/task-commented.event';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationsHelper } from './notifications.helper';
import { NotificationsListener } from './notifications.listener';
import { NotificationsService } from './notifications.service';

const assignedDto: CreateNotificationDto = {
  type: NotificationType.TASK_ASSIGNED,
  message: 'You were assigned to "Write the migration"',
  userId: 7,
  taskId: 5,
};

const commentedDto: CreateNotificationDto = {
  type: NotificationType.TASK_COMMENTED,
  message: 'New comment on "Write the migration"',
  userId: 7,
  taskId: 5,
};

const notification: NotificationEntity = {
  id: 1,
  type: NotificationType.TASK_ASSIGNED,
  message: assignedDto.message,
  userId: 7,
  taskId: 5,
  readAt: null,
  createdAt: new Date('2026-01-01'),
};

const assignedEvent: TaskAssignedEvent = {
  taskId: 5,
  assigneeId: 7,
  actorId: 3,
};

const commentedEvent: TaskCommentedEvent = { taskId: 5, actorId: 3 };

const createServiceMock = () => ({
  create: jest.fn().mockResolvedValue(notification),
});

const createHelperMock = () => ({
  buildTaskAssignedNotification: jest.fn().mockResolvedValue(assignedDto),
  buildTaskCommentedNotification: jest.fn().mockResolvedValue(commentedDto),
});

describe('NotificationsListener', () => {
  let listener: NotificationsListener;
  let service: ReturnType<typeof createServiceMock>;
  let helper: ReturnType<typeof createHelperMock>;
  let loggedError: jest.SpyInstance;

  beforeEach(async () => {
    const serviceMock = createServiceMock();
    const helperMock = createHelperMock();

    // The handlers log and swallow their failures; keep that off the test output.
    loggedError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsListener,
        { provide: NotificationsService, useValue: serviceMock },
        { provide: NotificationsHelper, useValue: helperMock },
      ],
    }).compile();

    listener = module.get(NotificationsListener);
    service = serviceMock;
    helper = helperMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('handleTaskAssigned', () => {
    it('creates the notification the helper resolved for the event', async () => {
      await listener.handleTaskAssigned(assignedEvent);

      expect(helper.buildTaskAssignedNotification).toHaveBeenCalledWith(
        assignedEvent,
      );
      expect(service.create).toHaveBeenCalledWith(assignedDto);
    });

    it('creates nothing when the helper finds no recipient', async () => {
      helper.buildTaskAssignedNotification.mockResolvedValue(null);

      await listener.handleTaskAssigned(assignedEvent);

      expect(service.create).not.toHaveBeenCalled();
    });

    it('swallows a failed create so the assignment still succeeds', async () => {
      service.create.mockRejectedValue(new Error('database is down'));

      await expect(
        listener.handleTaskAssigned(assignedEvent),
      ).resolves.toBeUndefined();
      expect(loggedError).toHaveBeenCalled();
    });

    it('swallows a failed lookup so the assignment still succeeds', async () => {
      helper.buildTaskAssignedNotification.mockRejectedValue(
        new Error('database is down'),
      );

      await expect(
        listener.handleTaskAssigned(assignedEvent),
      ).resolves.toBeUndefined();
      expect(service.create).not.toHaveBeenCalled();
    });
  });

  describe('handleTaskCommented', () => {
    it('creates the notification the helper resolved for the event', async () => {
      await listener.handleTaskCommented(commentedEvent);

      expect(helper.buildTaskCommentedNotification).toHaveBeenCalledWith(
        commentedEvent,
      );
      expect(service.create).toHaveBeenCalledWith(commentedDto);
    });

    it('creates nothing when the helper finds no recipient', async () => {
      helper.buildTaskCommentedNotification.mockResolvedValue(null);

      await listener.handleTaskCommented(commentedEvent);

      expect(service.create).not.toHaveBeenCalled();
    });

    it('swallows a failed create so the comment still succeeds', async () => {
      service.create.mockRejectedValue(new Error('database is down'));

      await expect(
        listener.handleTaskCommented(commentedEvent),
      ).resolves.toBeUndefined();
      expect(loggedError).toHaveBeenCalled();
    });
  });
});
