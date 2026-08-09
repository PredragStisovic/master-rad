import { Test, TestingModule } from '@nestjs/testing';
import { TaskStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportsRepository } from './reports.repository';

const createPrismaMock = () => ({
  task: {
    groupBy: jest.fn().mockResolvedValue([]),
  },
});

describe('ReportsRepository', () => {
  let repository: ReportsRepository;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    const prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsRepository,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    repository = module.get(ReportsRepository);
    prisma = prismaMock;
  });

  describe('countTasksByStatus', () => {
    it('groups the project’s tasks by status', async () => {
      prisma.task.groupBy.mockResolvedValue([
        { status: TaskStatus.TODO, _count: { _all: 3 } },
      ]);

      await expect(repository.countTasksByStatus(1)).resolves.toEqual([
        { status: TaskStatus.TODO, count: 3 },
      ]);
      expect(prisma.task.groupBy).toHaveBeenCalledWith({
        by: ['status'],
        where: { projectId: 1 },
        _count: { _all: true },
      });
    });
  });

  describe('countTasksByAssignee', () => {
    it('keeps the unassigned bucket as a null assignee', async () => {
      prisma.task.groupBy.mockResolvedValue([
        { assigneeId: null, _count: { _all: 2 } },
      ]);

      await expect(repository.countTasksByAssignee(1)).resolves.toEqual([
        { assigneeId: null, count: 2 },
      ]);
      expect(prisma.task.groupBy).toHaveBeenCalledWith({
        by: ['assigneeId'],
        where: { projectId: 1 },
        _count: { _all: true },
      });
    });
  });
});
