import { NotificationType } from '../../../generated/prisma/client';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationsController } from './notifications.controller';
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

const page = {
  data: [notification],
  meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
};

const createServiceMock = () => ({
  create: jest.fn().mockResolvedValue(notification),
  findAll: jest.fn().mockResolvedValue(page),
  markRead: jest.fn().mockResolvedValue(notification),
});

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: ReturnType<typeof createServiceMock>;

  // Instantiated directly: the route guards declared on the controller are
  // policy, exercised in the e2e specs, not part of this unit.
  beforeEach(() => {
    service = createServiceMock();
    controller = new NotificationsController(
      service as unknown as NotificationsService,
    );
  });

  describe('create', () => {
    it('forwards the payload, recipient included', async () => {
      const dto = {
        type: NotificationType.TASK_ASSIGNED,
        message: notification.message,
        userId: 7,
        taskId: 5,
      };

      await expect(controller.create(dto)).resolves.toEqual(notification);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('lists the caller’s own notifications', async () => {
      const query = new QueryNotificationsDto();

      await expect(controller.findAll(7, query)).resolves.toEqual(page);
      expect(service.findAll).toHaveBeenCalledWith(7, query);
    });
  });

  describe('markRead', () => {
    it('passes the caller so the service can scope the lookup', async () => {
      await expect(controller.markRead(1, 7)).resolves.toEqual(notification);
      expect(service.markRead).toHaveBeenCalledWith(7, 1);
    });
  });
});
