import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TaskPriority, TaskStatus } from '../../../generated/prisma/client';
import { ProjectEntity } from '../projects/entities/project.entity';
import { ProjectsRepository } from '../projects/projects.repository';
import { TaskEntity } from './entities/task.entity';
import { TasksHelper } from './tasks.helper';
import { TasksRepository } from './tasks.repository';

const project: ProjectEntity = {
  id: 1,
  name: 'Alpha',
  description: null,
  ownerId: 1,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

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

const createTasksRepositoryMock = () => ({
  findById: jest.fn().mockResolvedValue(task),
});

const createProjectsRepositoryMock = () => ({
  findById: jest.fn().mockResolvedValue(project),
});

describe('TasksHelper', () => {
  let helper: TasksHelper;
  let tasksRepository: ReturnType<typeof createTasksRepositoryMock>;
  let projectsRepository: ReturnType<typeof createProjectsRepositoryMock>;

  beforeEach(async () => {
    const tasksRepositoryMock = createTasksRepositoryMock();
    const projectsRepositoryMock = createProjectsRepositoryMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksHelper,
        { provide: TasksRepository, useValue: tasksRepositoryMock },
        { provide: ProjectsRepository, useValue: projectsRepositoryMock },
      ],
    }).compile();

    helper = module.get(TasksHelper);
    tasksRepository = tasksRepositoryMock;
    projectsRepository = projectsRepositoryMock;
  });

  describe('assertProjectExists', () => {
    it('passes when the project exists', async () => {
      await expect(helper.assertProjectExists(1)).resolves.toBeUndefined();
      expect(projectsRepository.findById).toHaveBeenCalledWith(1);
    });

    it('throws when the project is missing', async () => {
      projectsRepository.findById.mockResolvedValue(null);

      await expect(helper.assertProjectExists(99)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getExistingTask', () => {
    it('returns the task', async () => {
      await expect(helper.getExistingTask(1, 1)).resolves.toEqual(task);
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
  });
});
