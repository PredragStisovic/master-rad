import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TaskPriority, TaskStatus } from '../../../generated/prisma/client';
import { TaskEntity } from './entities/task.entity';
import { TasksRepository } from './tasks.repository';
import { TasksScopeHelper } from './tasks-scope.helper';

const task: TaskEntity = {
  id: 1,
  title: 'Write the migration',
  description: null,
  status: TaskStatus.TODO,
  priority: TaskPriority.MEDIUM,
  projectId: 1,
  assigneeId: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const createTasksRepositoryMock = () => ({
  findById: jest.fn().mockResolvedValue(task),
});

describe('TasksScopeHelper', () => {
  let helper: TasksScopeHelper;
  let tasksRepository: ReturnType<typeof createTasksRepositoryMock>;

  beforeEach(async () => {
    const tasksRepositoryMock = createTasksRepositoryMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksScopeHelper,
        { provide: TasksRepository, useValue: tasksRepositoryMock },
      ],
    }).compile();

    helper = module.get(TasksScopeHelper);
    tasksRepository = tasksRepositoryMock;
  });

  describe('getExistingTask', () => {
    it('returns the task that belongs to the project', async () => {
      await expect(helper.getExistingTask(1, 1)).resolves.toEqual(task);
      expect(tasksRepository.findById).toHaveBeenCalledWith(1);
    });

    it('throws when the task is missing', async () => {
      tasksRepository.findById.mockResolvedValue(null);

      await expect(helper.getExistingTask(1, 99)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws when the task belongs to another project', async () => {
      await expect(helper.getExistingTask(2, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    // Both the task routes and the comment routes surface this message now, so
    // it is pinned here rather than duplicated in each caller's spec.
    it('names the task and the project in the error', async () => {
      await expect(helper.getExistingTask(2, 1)).rejects.toThrow(
        'Task with id 1 not found in project 2',
      );
    });
  });
});
