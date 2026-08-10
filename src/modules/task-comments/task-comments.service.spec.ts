import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { TASK_COMMENTED_EVENT } from '../../common/events/task-commented.event';
import { TaskEntity } from '../tasks/entities/task.entity';
import { TasksScopeHelper } from '../tasks/tasks-scope.helper';
import { TaskPriority, TaskStatus } from '../../../generated/prisma/client';
import { TaskCommentEntity } from './entities/task-comment.entity';
import { TaskCommentsHelper } from './task-comments.helper';
import { TaskCommentsRepository } from './task-comments.repository';
import { TaskCommentsService } from './task-comments.service';

const comment: TaskCommentEntity = {
  id: 1,
  body: 'Looks good to me',
  taskId: 5,
  authorId: 7,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const createRepositoryMock = () => ({
  create: jest.fn().mockResolvedValue(comment),
  findMany: jest.fn().mockResolvedValue([comment]),
  update: jest.fn().mockResolvedValue(comment),
  delete: jest.fn().mockResolvedValue(comment),
});

const task: TaskEntity = {
  id: 5,
  title: 'Write the migration',
  description: null,
  status: TaskStatus.TODO,
  priority: TaskPriority.MEDIUM,
  projectId: 1,
  assigneeId: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const createHelperMock = () => ({
  getExistingComment: jest.fn().mockResolvedValue(comment),
  assertIsAuthor: jest.fn(),
});

const createScopeHelperMock = () => ({
  getExistingTask: jest.fn().mockResolvedValue(task),
});

const createEventEmitterMock = () => ({
  emit: jest.fn().mockReturnValue(true),
});

describe('TaskCommentsService', () => {
  let service: TaskCommentsService;
  let repository: ReturnType<typeof createRepositoryMock>;
  let helper: ReturnType<typeof createHelperMock>;
  let scopeHelper: ReturnType<typeof createScopeHelperMock>;
  let eventEmitter: ReturnType<typeof createEventEmitterMock>;

  beforeEach(async () => {
    const repositoryMock = createRepositoryMock();
    const helperMock = createHelperMock();
    const scopeHelperMock = createScopeHelperMock();
    const eventEmitterMock = createEventEmitterMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskCommentsService,
        { provide: TaskCommentsRepository, useValue: repositoryMock },
        { provide: TaskCommentsHelper, useValue: helperMock },
        { provide: TasksScopeHelper, useValue: scopeHelperMock },
        { provide: EventEmitter2, useValue: eventEmitterMock },
      ],
    }).compile();

    service = module.get(TaskCommentsService);
    repository = repositoryMock;
    helper = helperMock;
    scopeHelper = scopeHelperMock;
    eventEmitter = eventEmitterMock;
  });

  describe('create', () => {
    it('persists the comment under the task with the caller as author', async () => {
      await expect(
        service.create(1, 5, 7, { body: 'Looks good to me' }),
      ).resolves.toEqual(comment);

      expect(scopeHelper.getExistingTask).toHaveBeenCalledWith(1, 5);
      expect(repository.create).toHaveBeenCalledWith({
        body: 'Looks good to me',
        taskId: 5,
        authorId: 7,
      });
    });

    it('announces the comment with the author as the actor', async () => {
      await service.create(1, 5, 7, { body: 'Looks good to me' });

      expect(eventEmitter.emit).toHaveBeenCalledWith(TASK_COMMENTED_EVENT, {
        taskId: 5,
        actorId: 7,
      });
    });

    it('does not persist when the task is missing', async () => {
      scopeHelper.getExistingTask.mockRejectedValue(new NotFoundException());

      await expect(
        service.create(1, 99, 7, { body: 'Orphan' }),
      ).rejects.toThrow(NotFoundException);
      expect(repository.create).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns the comments of the task', async () => {
      await expect(service.findAll(1, 5)).resolves.toEqual([comment]);

      expect(scopeHelper.getExistingTask).toHaveBeenCalledWith(1, 5);
      expect(repository.findMany).toHaveBeenCalledWith(5);
    });

    it('does not query when the task is missing', async () => {
      scopeHelper.getExistingTask.mockRejectedValue(new NotFoundException());

      await expect(service.findAll(1, 99)).rejects.toThrow(NotFoundException);
      expect(repository.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns the comment of the task', async () => {
      await expect(service.findOne(1, 5, 1)).resolves.toEqual(comment);

      expect(scopeHelper.getExistingTask).toHaveBeenCalledWith(1, 5);
      expect(helper.getExistingComment).toHaveBeenCalledWith(5, 1);
    });

    it('propagates the helper error when the comment is missing', async () => {
      helper.getExistingComment.mockRejectedValue(new NotFoundException());

      await expect(service.findOne(1, 5, 99)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates the comment of its author', async () => {
      await expect(
        service.update(1, 5, 1, 7, { body: 'Edited' }),
      ).resolves.toEqual(comment);

      expect(helper.assertIsAuthor).toHaveBeenCalledWith(comment, 7);
      expect(repository.update).toHaveBeenCalledWith(1, { body: 'Edited' });
    });

    it('does not persist when the caller is not the author', async () => {
      helper.assertIsAuthor.mockImplementation(() => {
        throw new ForbiddenException();
      });

      await expect(
        service.update(1, 5, 1, 8, { body: 'Edited' }),
      ).rejects.toThrow(ForbiddenException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('does not persist when the comment is missing', async () => {
      helper.getExistingComment.mockRejectedValue(new NotFoundException());

      await expect(
        service.update(1, 5, 99, 7, { body: 'Edited' }),
      ).rejects.toThrow(NotFoundException);
      expect(helper.assertIsAuthor).not.toHaveBeenCalled();
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes the comment of its author', async () => {
      await expect(service.remove(1, 5, 1, 7)).resolves.toEqual(comment);

      expect(helper.assertIsAuthor).toHaveBeenCalledWith(comment, 7);
      expect(repository.delete).toHaveBeenCalledWith(1);
    });

    it('does not delete when the caller is not the author', async () => {
      helper.assertIsAuthor.mockImplementation(() => {
        throw new ForbiddenException();
      });

      await expect(service.remove(1, 5, 1, 8)).rejects.toThrow(
        ForbiddenException,
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('does not delete when the task is missing', async () => {
      scopeHelper.getExistingTask.mockRejectedValue(new NotFoundException());

      await expect(service.remove(1, 99, 1, 7)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
