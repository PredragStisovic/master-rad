import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditAction } from '../../../generated/prisma/client';
import { QueryUserActivityDto } from './dto/query-user-activity.dto';
import { ReportsHelper } from './reports.helper';
import { UserActivityHelper } from './user-activity.helper';
import { UserActivityRepository } from './user-activity.repository';
import { UserActivityService } from './user-activity.service';

const actionRows = [
  { action: AuditAction.CREATE, count: 9 },
  { action: AuditAction.UPDATE, count: 3 },
];

const entityTypeRows = [{ entityType: 'Tasks', count: 12 }];

const byAction = { CREATE: 9, UPDATE: 3, DELETE: 0 };
const where = { userId: 7 };

const from = new Date('2026-01-01T00:00:00.000Z');
const to = new Date('2026-02-01T00:00:00.000Z');

const query = (
  overrides: Partial<QueryUserActivityDto> = {},
): QueryUserActivityDto => Object.assign(new QueryUserActivityDto(), overrides);

const createRepositoryMock = () => ({
  countByAction: jest.fn().mockResolvedValue(actionRows),
  countByEntityType: jest.fn().mockResolvedValue(entityTypeRows),
});

const createHelperMock = () => ({
  assertUserExists: jest.fn().mockResolvedValue(undefined),
  assertWindowIsOrdered: jest.fn(),
  buildWhere: jest.fn().mockReturnValue(where),
  cacheKey: jest.fn().mockReturnValue('reports:user-activity:v1:u7:open:open'),
  toActionCounts: jest.fn().mockReturnValue(byAction),
  toEntityTypeCounts: jest.fn().mockReturnValue(entityTypeRows),
});

const createReportsHelperMock = () => ({
  sumCounts: jest.fn().mockReturnValue(12),
});

/** Misses by default, so the tests below exercise the uncached path. */
const createCacheMock = () => ({
  wrap: jest.fn((_key: string, load: () => Promise<unknown>) => load()),
});

describe('UserActivityService', () => {
  let service: UserActivityService;
  let repository: ReturnType<typeof createRepositoryMock>;
  let helper: ReturnType<typeof createHelperMock>;
  let reportsHelper: ReturnType<typeof createReportsHelperMock>;
  let cache: ReturnType<typeof createCacheMock>;

  beforeEach(async () => {
    const repositoryMock = createRepositoryMock();
    const helperMock = createHelperMock();
    const reportsHelperMock = createReportsHelperMock();
    const cacheMock = createCacheMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserActivityService,
        { provide: UserActivityRepository, useValue: repositoryMock },
        { provide: UserActivityHelper, useValue: helperMock },
        { provide: ReportsHelper, useValue: reportsHelperMock },
        { provide: CACHE_MANAGER, useValue: cacheMock },
      ],
    }).compile();

    service = module.get(UserActivityService);
    repository = repositoryMock;
    helper = helperMock;
    reportsHelper = reportsHelperMock;
    cache = cacheMock;
  });

  describe('userActivity', () => {
    it('reports both groupings and echoes the window back', async () => {
      await expect(
        service.userActivity(7, query({ from, to })),
      ).resolves.toEqual({
        userId: 7,
        from,
        to,
        totalActions: 12,
        byAction,
        byEntityType: entityTypeRows,
      });
      expect(repository.countByAction).toHaveBeenCalledWith(where);
      expect(repository.countByEntityType).toHaveBeenCalledWith(where);
    });

    it('reports an unbounded window as nulls rather than as absent keys', async () => {
      const result = await service.userActivity(7, query());

      expect(result.from).toBeNull();
      expect(result.to).toBeNull();
    });

    it('totals the window from the action buckets', async () => {
      await service.userActivity(7, query());

      expect(reportsHelper.sumCounts).toHaveBeenCalledWith(actionRows);
    });

    it('checks the user before running either query', async () => {
      helper.assertUserExists.mockRejectedValue(new NotFoundException());

      await expect(service.userActivity(404, query())).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.countByAction).not.toHaveBeenCalled();
    });

    it('rejects an inverted window before touching the database', async () => {
      helper.assertWindowIsOrdered.mockImplementation(() => {
        throw new BadRequestException();
      });

      await expect(
        service.userActivity(7, query({ from: to, to: from })),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(helper.assertUserExists).not.toHaveBeenCalled();
      expect(repository.countByAction).not.toHaveBeenCalled();
    });

    it('caches under the user-and-window key the helper builds', async () => {
      const dto = query({ from, to });

      await service.userActivity(7, dto);

      expect(helper.cacheKey).toHaveBeenCalledWith(7, dto);
      expect(cache.wrap).toHaveBeenCalledWith(
        'reports:user-activity:v1:u7:open:open',
        expect.any(Function),
      );
    });

    it('serves a cached report without aggregating again', async () => {
      const cached = { userId: 7, totalActions: 12, byAction };
      cache.wrap.mockResolvedValue(cached);

      await expect(service.userActivity(7, query())).resolves.toBe(cached);
      expect(repository.countByAction).not.toHaveBeenCalled();
      expect(repository.countByEntityType).not.toHaveBeenCalled();
    });

    it('never lets a cached entry answer for an unknown user', async () => {
      helper.assertUserExists.mockRejectedValue(new NotFoundException());

      await expect(service.userActivity(404, query())).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(cache.wrap).not.toHaveBeenCalled();
    });

    it('never lets a cached entry answer for an inverted window', async () => {
      helper.assertWindowIsOrdered.mockImplementation(() => {
        throw new BadRequestException();
      });

      await expect(
        service.userActivity(7, query({ from: to, to: from })),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(cache.wrap).not.toHaveBeenCalled();
    });
  });
});
