import { Test, TestingModule } from '@nestjs/testing';
import { TaskStatus } from '../../../generated/prisma/client';
import { ReportsHelper } from './reports.helper';
import { ReportsRepository } from './reports.repository';
import { ReportsService } from './reports.service';

const statusRows = [
  { status: TaskStatus.TODO, count: 3 },
  { status: TaskStatus.DONE, count: 2 },
];

const assigneeRows = [
  { assigneeId: 1, count: 4 },
  { assigneeId: null, count: 1 },
];

const byStatus = { TODO: 3, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 2 };

const createRepositoryMock = () => ({
  countTasksByStatus: jest.fn().mockResolvedValue(statusRows),
  countTasksByAssignee: jest.fn().mockResolvedValue(assigneeRows),
});

const createHelperMock = () => ({
  toStatusCounts: jest.fn().mockReturnValue(byStatus),
  toAssigneeCounts: jest.fn().mockReturnValue(assigneeRows),
  sumCounts: jest.fn().mockReturnValue(5),
});

describe('ReportsService', () => {
  let service: ReportsService;
  let repository: ReturnType<typeof createRepositoryMock>;
  let helper: ReturnType<typeof createHelperMock>;

  beforeEach(async () => {
    const repositoryMock = createRepositoryMock();
    const helperMock = createHelperMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: ReportsRepository, useValue: repositoryMock },
        { provide: ReportsHelper, useValue: helperMock },
      ],
    }).compile();

    service = module.get(ReportsService);
    repository = repositoryMock;
    helper = helperMock;
  });

  describe('projectSummary', () => {
    it('reports both groupings for the project it was asked about', async () => {
      await expect(service.projectSummary(1)).resolves.toEqual({
        projectId: 1,
        totalTasks: 5,
        byStatus,
        byAssignee: assigneeRows,
      });
      expect(repository.countTasksByStatus).toHaveBeenCalledWith(1);
      expect(repository.countTasksByAssignee).toHaveBeenCalledWith(1);
    });

    it('totals the project from the status buckets', async () => {
      await service.projectSummary(1);

      expect(helper.sumCounts).toHaveBeenCalledWith(statusRows);
    });

    it('shapes each grouping through its own mapper', async () => {
      await service.projectSummary(1);

      expect(helper.toStatusCounts).toHaveBeenCalledWith(statusRows);
      expect(helper.toAssigneeCounts).toHaveBeenCalledWith(assigneeRows);
    });
  });
});
