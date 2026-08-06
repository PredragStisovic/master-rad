import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
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

const createHelperMock = () => ({
  assertTaskExists: jest.fn().mockResolvedValue(undefined),
  getExistingComment: jest.fn().mockResolvedValue(comment),
  assertIsAuthor: jest.fn(),
});

describe('TaskCommentsService', () => {
  let service: TaskCommentsService;
  let repository: ReturnType<typeof createRepositoryMock>;
  let helper: ReturnType<typeof createHelperMock>;

  beforeEach(async () => {
    const repositoryMock = createRepositoryMock();
    const helperMock = createHelperMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskCommentsService,
        { provide: TaskCommentsRepository, useValue: repositoryMock },
        { provide: TaskCommentsHelper, useValue: helperMock },
      ],
    }).compile();

    service = module.get(TaskCommentsService);
    repository = repositoryMock;
    helper = helperMock;
  });

  describe('create', () => {
    it('persists the comment under the task with the caller as author', async () => {
      await expect(
        service.create(1, 5, 7, { body: 'Looks good to me' }),
      ).resolves.toEqual(comment);

      expect(helper.assertTaskExists).toHaveBeenCalledWith(1, 5);
      expect(repository.create).toHaveBeenCalledWith({
        body: 'Looks good to me',
        taskId: 5,
        authorId: 7,
      });
    });

    it('does not persist when the task is missing', async () => {
      helper.assertTaskExists.mockRejectedValue(new NotFoundException());

      await expect(
        service.create(1, 99, 7, { body: 'Orphan' }),
      ).rejects.toThrow(NotFoundException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns the comments of the task', async () => {
      await expect(service.findAll(1, 5)).resolves.toEqual([comment]);

      expect(helper.assertTaskExists).toHaveBeenCalledWith(1, 5);
      expect(repository.findMany).toHaveBeenCalledWith(5);
    });

    it('does not query when the task is missing', async () => {
      helper.assertTaskExists.mockRejectedValue(new NotFoundException());

      await expect(service.findAll(1, 99)).rejects.toThrow(NotFoundException);
      expect(repository.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns the comment of the task', async () => {
      await expect(service.findOne(1, 5, 1)).resolves.toEqual(comment);

      expect(helper.assertTaskExists).toHaveBeenCalledWith(1, 5);
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
      helper.assertTaskExists.mockRejectedValue(new NotFoundException());

      await expect(service.remove(1, 99, 1, 7)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
