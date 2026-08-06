import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { TaskCommentEntity } from './entities/task-comment.entity';
import { TaskCommentsRepository } from './task-comments.repository';

const comment: TaskCommentEntity = {
  id: 1,
  body: 'Looks good to me',
  taskId: 5,
  authorId: 7,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const commentSelect = {
  id: true,
  body: true,
  taskId: true,
  authorId: true,
  createdAt: true,
  updatedAt: true,
};

const createPrismaMock = () => ({
  taskComment: {
    create: jest.fn().mockResolvedValue(comment),
    findMany: jest.fn().mockResolvedValue([comment]),
    findUnique: jest.fn().mockResolvedValue(comment),
    update: jest.fn().mockResolvedValue(comment),
    delete: jest.fn().mockResolvedValue(comment),
  },
});

describe('TaskCommentsRepository', () => {
  let repository: TaskCommentsRepository;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    const prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskCommentsRepository,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    repository = module.get(TaskCommentsRepository);
    prisma = prismaMock;
  });

  describe('create', () => {
    it('inserts the comment and returns the exposed columns', async () => {
      const data = { body: 'Looks good to me', taskId: 5, authorId: 7 };

      await expect(repository.create(data)).resolves.toEqual(comment);
      expect(prisma.taskComment.create).toHaveBeenCalledWith({
        data,
        select: commentSelect,
      });
    });
  });

  describe('findMany', () => {
    it('reads the comments of one task oldest first', async () => {
      await expect(repository.findMany(5)).resolves.toEqual([comment]);
      expect(prisma.taskComment.findMany).toHaveBeenCalledWith({
        where: { taskId: 5 },
        orderBy: { createdAt: 'asc' },
        select: commentSelect,
      });
    });
  });

  describe('findById', () => {
    it('looks the comment up by its id', async () => {
      await expect(repository.findById(1)).resolves.toEqual(comment);
      expect(prisma.taskComment.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: commentSelect,
      });
    });

    it('returns null when there is no such comment', async () => {
      prisma.taskComment.findUnique.mockResolvedValue(null);

      await expect(repository.findById(99)).resolves.toBeNull();
    });
  });

  describe('update', () => {
    it('updates the comment by id', async () => {
      const data = { body: 'Edited' };

      await expect(repository.update(1, data)).resolves.toEqual(comment);
      expect(prisma.taskComment.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data,
        select: commentSelect,
      });
    });
  });

  describe('delete', () => {
    it('deletes the comment by id', async () => {
      await expect(repository.delete(1)).resolves.toEqual(comment);
      expect(prisma.taskComment.delete).toHaveBeenCalledWith({
        where: { id: 1 },
        select: commentSelect,
      });
    });
  });
});
