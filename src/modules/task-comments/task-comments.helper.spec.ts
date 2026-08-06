import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TaskPriority, TaskStatus } from '../../../generated/prisma/client';
import { TaskEntity } from '../tasks/entities/task.entity';
import { TasksRepository } from '../tasks/tasks.repository';
import { TaskCommentEntity } from './entities/task-comment.entity';
import { TaskCommentsHelper } from './task-comments.helper';
import { TaskCommentsRepository } from './task-comments.repository';

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

const createTasksRepositoryMock = () => ({
  findById: jest.fn().mockResolvedValue(task),
});

describe('TaskCommentsHelper', () => {
  let helper: TaskCommentsHelper;
  let commentsRepository: ReturnType<typeof createCommentsRepositoryMock>;
  let tasksRepository: ReturnType<typeof createTasksRepositoryMock>;

  beforeEach(async () => {
    const commentsRepositoryMock = createCommentsRepositoryMock();
    const tasksRepositoryMock = createTasksRepositoryMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskCommentsHelper,
        { provide: TaskCommentsRepository, useValue: commentsRepositoryMock },
        { provide: TasksRepository, useValue: tasksRepositoryMock },
      ],
    }).compile();

    helper = module.get(TaskCommentsHelper);
    commentsRepository = commentsRepositoryMock;
    tasksRepository = tasksRepositoryMock;
  });

  describe('assertTaskExists', () => {
    it('passes when the task belongs to the project', async () => {
      await expect(helper.assertTaskExists(1, 5)).resolves.toBeUndefined();
      expect(tasksRepository.findById).toHaveBeenCalledWith(5);
    });

    it('throws when the task is missing', async () => {
      tasksRepository.findById.mockResolvedValue(null);

      await expect(helper.assertTaskExists(1, 99)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws when the task belongs to another project', async () => {
      await expect(helper.assertTaskExists(2, 5)).rejects.toThrow(
        NotFoundException,
      );
    });
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
