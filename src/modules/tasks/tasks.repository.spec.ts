import { Test, TestingModule } from '@nestjs/testing';
import { TaskPriority, TaskStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TaskEntity } from './entities/task.entity';
import { TasksRepository } from './tasks.repository';

const task: TaskEntity = {
  id: 1,
  title: 'Write the migration',
  description: null,
  status: TaskStatus.TODO,
  priority: TaskPriority.MEDIUM,
  projectId: 1,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const taskSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  projectId: true,
  createdAt: true,
  updatedAt: true,
};

const createPrismaMock = () => ({
  task: {
    create: jest.fn().mockResolvedValue(task),
    findMany: jest.fn().mockResolvedValue([task]),
    findUnique: jest.fn().mockResolvedValue(task),
    update: jest.fn().mockResolvedValue(task),
    delete: jest.fn().mockResolvedValue(task),
  },
});

describe('TasksRepository', () => {
  let repository: TasksRepository;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    const prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksRepository,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    repository = module.get(TasksRepository);
    prisma = prismaMock;
  });

  describe('create', () => {
    it('inserts the task and returns the exposed columns', async () => {
      const data = { title: 'Write the migration', projectId: 1 };

      await expect(repository.create(data)).resolves.toEqual(task);
      expect(prisma.task.create).toHaveBeenCalledWith({
        data,
        select: taskSelect,
      });
    });
  });

  describe('findMany', () => {
    it('scopes the query to the project and orders by id', async () => {
      await expect(repository.findMany(1)).resolves.toEqual([task]);
      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: { projectId: 1 },
        orderBy: { id: 'asc' },
        select: taskSelect,
      });
    });
  });

  describe('findById', () => {
    it('looks the task up by its id', async () => {
      await expect(repository.findById(1)).resolves.toEqual(task);
      expect(prisma.task.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: taskSelect,
      });
    });

    it('returns null when there is no such task', async () => {
      prisma.task.findUnique.mockResolvedValue(null);

      await expect(repository.findById(99)).resolves.toBeNull();
    });
  });

  describe('update', () => {
    it('updates the task by id', async () => {
      const data = { status: TaskStatus.DONE };

      await expect(repository.update(1, data)).resolves.toEqual(task);
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data,
        select: taskSelect,
      });
    });
  });

  describe('delete', () => {
    it('deletes the task by id', async () => {
      await expect(repository.delete(1)).resolves.toEqual(task);
      expect(prisma.task.delete).toHaveBeenCalledWith({
        where: { id: 1 },
        select: taskSelect,
      });
    });
  });
});
