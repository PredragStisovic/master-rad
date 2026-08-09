import { Test, TestingModule } from '@nestjs/testing';
import { AuditAction } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UserActivityRepository } from './user-activity.repository';

const where = { userId: 7 };

const createPrismaMock = () => ({
  auditLog: {
    groupBy: jest.fn().mockResolvedValue([]),
  },
});

describe('UserActivityRepository', () => {
  let repository: UserActivityRepository;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    const prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserActivityRepository,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    repository = module.get(UserActivityRepository);
    prisma = prismaMock;
  });

  describe('countByAction', () => {
    it('groups the filtered audit rows by action', async () => {
      prisma.auditLog.groupBy.mockResolvedValue([
        { action: AuditAction.CREATE, _count: { _all: 9 } },
      ]);

      await expect(repository.countByAction(where)).resolves.toEqual([
        { action: AuditAction.CREATE, count: 9 },
      ]);
      expect(prisma.auditLog.groupBy).toHaveBeenCalledWith({
        by: ['action'],
        where,
        _count: { _all: true },
      });
    });
  });

  describe('countByEntityType', () => {
    it('groups the same filtered rows by entity type', async () => {
      prisma.auditLog.groupBy.mockResolvedValue([
        { entityType: 'Tasks', _count: { _all: 4 } },
      ]);

      await expect(repository.countByEntityType(where)).resolves.toEqual([
        { entityType: 'Tasks', count: 4 },
      ]);
      expect(prisma.auditLog.groupBy).toHaveBeenCalledWith({
        by: ['entityType'],
        where,
        _count: { _all: true },
      });
    });
  });
});
