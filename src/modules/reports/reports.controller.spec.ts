import { ProjectSummaryEntity } from './entities/project-summary.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

const summary: ProjectSummaryEntity = {
  projectId: 1,
  totalTasks: 5,
  byStatus: { TODO: 3, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 2 },
  byAssignee: [{ assigneeId: 1, count: 5 }],
};

const createServiceMock = () => ({
  projectSummary: jest.fn().mockResolvedValue(summary),
});

describe('ReportsController', () => {
  let controller: ReportsController;
  let service: ReturnType<typeof createServiceMock>;

  // Instantiated directly: the route guards declared on the controller are
  // policy, exercised in the e2e specs, not part of this unit.
  beforeEach(() => {
    service = createServiceMock();
    controller = new ReportsController(service as unknown as ReportsService);
  });

  describe('projectSummary', () => {
    it('forwards the project from the route', async () => {
      await expect(controller.projectSummary(1)).resolves.toEqual(summary);
      expect(service.projectSummary).toHaveBeenCalledWith(1);
    });
  });
});
