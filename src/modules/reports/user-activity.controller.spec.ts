import { QueryUserActivityDto } from './dto/query-user-activity.dto';
import { UserActivityEntity } from './entities/user-activity.entity';
import { UserActivityController } from './user-activity.controller';
import { UserActivityService } from './user-activity.service';

const activity: UserActivityEntity = {
  userId: 7,
  from: null,
  to: null,
  totalActions: 12,
  byAction: { CREATE: 9, UPDATE: 3, DELETE: 0 },
  byEntityType: [{ entityType: 'Tasks', count: 12 }],
};

const createServiceMock = () => ({
  userActivity: jest.fn().mockResolvedValue(activity),
});

describe('UserActivityController', () => {
  let controller: UserActivityController;
  let service: ReturnType<typeof createServiceMock>;

  // Instantiated directly: the route guards declared on the controller are
  // policy, exercised in the e2e specs, not part of this unit.
  beforeEach(() => {
    service = createServiceMock();
    controller = new UserActivityController(
      service as unknown as UserActivityService,
    );
  });

  describe('userActivity', () => {
    it('forwards the subject from the route and the window from the query', async () => {
      const query = Object.assign(new QueryUserActivityDto(), {
        from: new Date('2026-01-01T00:00:00.000Z'),
      });

      await expect(controller.userActivity(7, query)).resolves.toEqual(
        activity,
      );
      expect(service.userActivity).toHaveBeenCalledWith(7, query);
    });
  });
});
