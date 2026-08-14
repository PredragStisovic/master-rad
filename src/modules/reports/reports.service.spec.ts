import { CACHE_MANAGER } from '@nestjs/cache-manager';
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
  summaryCacheKey: jest.fn().mockReturnValue('reports:project-summary:v1:p1'),
  toStatusCounts: jest.fn().mockReturnValue(byStatus),
  toAssigneeCounts: jest.fn().mockReturnValue(assigneeRows),
  sumCounts: jest.fn().mockReturnValue(5),
});

/** Misses by default, so the tests below exercise the uncached path. */
const createCacheMock = () => ({
  wrap: jest.fn((_key: string, load: () => Promise<unknown>) => load()),
});

describe('ReportsService', () => {
  let service: ReportsService;
  let repository: ReturnType<typeof createRepositoryMock>;
  let helper: ReturnType<typeof createHelperMock>;
  let cache: ReturnType<typeof createCacheMock>;

  beforeEach(async () => {
    const repositoryMock = createRepositoryMock();
    const helperMock = createHelperMock();
    const cacheMock = createCacheMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: ReportsRepository, useValue: repositoryMock },
        { provide: ReportsHelper, useValue: helperMock },
        { provide: CACHE_MANAGER, useValue: cacheMock },
      ],
    }).compile();

    service = module.get(ReportsService);
    repository = repositoryMock;
    helper = helperMock;
    cache = cacheMock;
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

    it('caches under the per-project key the helper builds', async () => {
      await service.projectSummary(1);

      expect(helper.summaryCacheKey).toHaveBeenCalledWith(1);
      expect(cache.wrap).toHaveBeenCalledWith(
        'reports:project-summary:v1:p1',
        expect.any(Function),
      );
    });

    it('serves a cached summary without aggregating again', async () => {
      const cached = { projectId: 1, totalTasks: 5, byStatus, byAssignee: [] };
      cache.wrap.mockResolvedValue(cached);

      await expect(service.projectSummary(1)).resolves.toBe(cached);
      expect(repository.countTasksByStatus).not.toHaveBeenCalled();
      expect(repository.countTasksByAssignee).not.toHaveBeenCalled();
    });
  });
});
