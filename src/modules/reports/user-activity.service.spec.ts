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
  toActionCounts: jest.fn().mockReturnValue(byAction),
  toEntityTypeCounts: jest.fn().mockReturnValue(entityTypeRows),
});

const createReportsHelperMock = () => ({
  sumCounts: jest.fn().mockReturnValue(12),
});

describe('UserActivityService', () => {
  let service: UserActivityService;
  let repository: ReturnType<typeof createRepositoryMock>;
  let helper: ReturnType<typeof createHelperMock>;
  let reportsHelper: ReturnType<typeof createReportsHelperMock>;

  beforeEach(async () => {
    const repositoryMock = createRepositoryMock();
    const helperMock = createHelperMock();
    const reportsHelperMock = createReportsHelperMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserActivityService,
        { provide: UserActivityRepository, useValue: repositoryMock },
        { provide: UserActivityHelper, useValue: helperMock },
        { provide: ReportsHelper, useValue: reportsHelperMock },
      ],
    }).compile();

    service = module.get(UserActivityService);
    repository = repositoryMock;
    helper = helperMock;
    reportsHelper = reportsHelperMock;
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
  });
});
