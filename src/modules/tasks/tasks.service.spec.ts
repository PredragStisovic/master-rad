import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TaskPriority, TaskStatus } from '../../../generated/prisma/client';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { TaskEntity } from './entities/task.entity';
import { TasksHelper } from './tasks.helper';
import { TasksRepository } from './tasks.repository';
import { TasksService } from './tasks.service';

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

const where = { projectId: 1 };

const buildQuery = (overrides: Partial<QueryTasksDto> = {}): QueryTasksDto =>
  Object.assign(new QueryTasksDto(), overrides);

const createRepositoryMock = () => ({
  create: jest.fn().mockResolvedValue(task),
  findMany: jest.fn().mockResolvedValue([task]),
  count: jest.fn().mockResolvedValue(1),
  update: jest.fn().mockResolvedValue(task),
  delete: jest.fn().mockResolvedValue(task),
});

const createHelperMock = () => ({
  assertProjectExists: jest.fn().mockResolvedValue(undefined),
  buildWhere: jest.fn().mockReturnValue(where),
  getExistingTask: jest.fn().mockResolvedValue(task),
  assertUserIsProjectMember: jest.fn().mockResolvedValue(undefined),
});

describe('TasksService', () => {
  let service: TasksService;
  let repository: ReturnType<typeof createRepositoryMock>;
  let helper: ReturnType<typeof createHelperMock>;

  beforeEach(async () => {
    const repositoryMock = createRepositoryMock();
    const helperMock = createHelperMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: TasksRepository, useValue: repositoryMock },
        { provide: TasksHelper, useValue: helperMock },
      ],
    }).compile();

    service = module.get(TasksService);
    repository = repositoryMock;
    helper = helperMock;
  });

  describe('create', () => {
    it('persists the task under the given project', async () => {
      await expect(
        service.create(1, { title: 'Write the migration' }),
      ).resolves.toEqual(task);

      expect(helper.assertProjectExists).toHaveBeenCalledWith(1);
      expect(repository.create).toHaveBeenCalledWith({
        title: 'Write the migration',
        projectId: 1,
      });
    });

    it('does not persist when the project is missing', async () => {
      helper.assertProjectExists.mockRejectedValue(new NotFoundException());

      await expect(service.create(99, { title: 'Orphan' })).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns the first page of the project tasks with its meta', async () => {
      await expect(service.findAll(1, buildQuery())).resolves.toEqual({
        data: [task],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      });

      expect(helper.assertProjectExists).toHaveBeenCalledWith(1);
      expect(repository.findMany).toHaveBeenCalledWith(where, 0, 20);
      expect(repository.count).toHaveBeenCalledWith(where);
    });

    it('passes the requested page window to the repository', async () => {
      const query = buildQuery({ page: 3, limit: 10 });

      await expect(service.findAll(1, query)).resolves.toMatchObject({
        meta: { page: 3, limit: 10 },
      });
      expect(repository.findMany).toHaveBeenCalledWith(where, 20, 10);
    });

    it('rounds the page count up for a partial last page', async () => {
      repository.count.mockResolvedValue(21);

      await expect(
        service.findAll(1, buildQuery({ limit: 10 })),
      ).resolves.toMatchObject({ meta: { total: 21, totalPages: 3 } });
    });

    it('filters through the where clause built by the helper', async () => {
      const query = buildQuery({ status: TaskStatus.DONE, assigneeId: 7 });

      await service.findAll(1, query);

      expect(helper.buildWhere).toHaveBeenCalledWith(1, query);
    });

    it('does not query when the project is missing', async () => {
      helper.assertProjectExists.mockRejectedValue(new NotFoundException());

      await expect(service.findAll(99, buildQuery())).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.findMany).not.toHaveBeenCalled();
      expect(repository.count).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns the task', async () => {
      await expect(service.findOne(1, 1)).resolves.toEqual(task);
      expect(helper.getExistingTask).toHaveBeenCalledWith(1, 1);
    });

    it('propagates the helper error when the task is missing', async () => {
      helper.getExistingTask.mockRejectedValue(new NotFoundException());

      await expect(service.findOne(1, 99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates an existing task', async () => {
      await expect(
        service.update(1, 1, { status: TaskStatus.DONE }),
      ).resolves.toEqual(task);

      expect(helper.getExistingTask).toHaveBeenCalledWith(1, 1);
      expect(repository.update).toHaveBeenCalledWith(1, {
        status: TaskStatus.DONE,
      });
    });

    it('does not persist when the task is missing', async () => {
      helper.getExistingTask.mockRejectedValue(new NotFoundException());

      await expect(service.update(1, 99, { title: 'Renamed' })).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('assign', () => {
    it('assigns the task to a project member', async () => {
      await expect(service.assign(1, 1, { assigneeId: 7 })).resolves.toEqual(
        task,
      );

      expect(helper.getExistingTask).toHaveBeenCalledWith(1, 1);
      expect(helper.assertUserIsProjectMember).toHaveBeenCalledWith(1, 7);
      expect(repository.update).toHaveBeenCalledWith(1, { assigneeId: 7 });
    });

    it('does not persist when the task is missing', async () => {
      helper.getExistingTask.mockRejectedValue(new NotFoundException());

      await expect(service.assign(1, 99, { assigneeId: 7 })).rejects.toThrow(
        NotFoundException,
      );
      expect(helper.assertUserIsProjectMember).not.toHaveBeenCalled();
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('does not persist when the assignee is not a project member', async () => {
      helper.assertUserIsProjectMember.mockRejectedValue(
        new BadRequestException(),
      );

      await expect(service.assign(1, 1, { assigneeId: 99 })).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('unassign', () => {
    it('clears the assignee of an existing task', async () => {
      await expect(service.unassign(1, 1)).resolves.toEqual(task);

      expect(helper.getExistingTask).toHaveBeenCalledWith(1, 1);
      expect(repository.update).toHaveBeenCalledWith(1, { assigneeId: null });
    });

    it('does not persist when the task is missing', async () => {
      helper.getExistingTask.mockRejectedValue(new NotFoundException());

      await expect(service.unassign(1, 99)).rejects.toThrow(NotFoundException);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes an existing task', async () => {
      await expect(service.remove(1, 1)).resolves.toEqual(task);

      expect(helper.getExistingTask).toHaveBeenCalledWith(1, 1);
      expect(repository.delete).toHaveBeenCalledWith(1);
    });

    it('does not delete when the task is missing', async () => {
      helper.getExistingTask.mockRejectedValue(new NotFoundException());

      await expect(service.remove(1, 99)).rejects.toThrow(NotFoundException);
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
