import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TaskCommentEntity } from './entities/task-comment.entity';
import { TaskCommentsHelper } from './task-comments.helper';
import { TaskCommentsRepository } from './task-comments.repository';

const comment: TaskCommentEntity = {
  id: 1,
  body: 'Looks good to me',
  taskId: 5,
  authorId: 7,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const createCommentsRepositoryMock = () => ({
  findById: jest.fn().mockResolvedValue(comment),
});

describe('TaskCommentsHelper', () => {
  let helper: TaskCommentsHelper;
  let commentsRepository: ReturnType<typeof createCommentsRepositoryMock>;

  beforeEach(async () => {
    const commentsRepositoryMock = createCommentsRepositoryMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskCommentsHelper,
        { provide: TaskCommentsRepository, useValue: commentsRepositoryMock },
      ],
    }).compile();

    helper = module.get(TaskCommentsHelper);
    commentsRepository = commentsRepositoryMock;
  });

  describe('getExistingComment', () => {
    it('returns the comment', async () => {
      await expect(helper.getExistingComment(5, 1)).resolves.toEqual(comment);
      expect(commentsRepository.findById).toHaveBeenCalledWith(1);
    });

    it('throws when the comment is missing', async () => {
      commentsRepository.findById.mockResolvedValue(null);

      await expect(helper.getExistingComment(5, 99)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws when the comment belongs to another task', async () => {
      await expect(helper.getExistingComment(6, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('assertIsAuthor', () => {
    it('passes for the author of the comment', () => {
      expect(() => helper.assertIsAuthor(comment, 7)).not.toThrow();
    });

    it('throws for any other project member', () => {
      expect(() => helper.assertIsAuthor(comment, 8)).toThrow(
        ForbiddenException,
      );
    });
  });
});
