import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { TaskAttachmentsEntity } from './entities/task-attachments.entity';
import { TaskAttachmentsRepository } from './task.attachments.repository';

const attachment: TaskAttachmentsEntity = {
  storageKey: '1767225600000-uuid-diagram.png',
  filename: 'diagram.png',
};

const attachmentSelect = { storageKey: true, filename: true };

const createPrismaMock = () => ({
  taskAttachment: {
    create: jest.fn().mockResolvedValue(attachment),
    findMany: jest.fn().mockResolvedValue([attachment]),
    findUnique: jest.fn().mockResolvedValue(attachment),
    findFirst: jest.fn().mockResolvedValue(attachment),
    count: jest.fn().mockResolvedValue(1),
    delete: jest.fn().mockResolvedValue(attachment),
  },
});

describe('TaskAttachmentsRepository', () => {
  let repository: TaskAttachmentsRepository;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    const prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskAttachmentsRepository,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    repository = module.get(TaskAttachmentsRepository);
    prisma = prismaMock;
  });

  describe('create', () => {
    it('inserts the attachment and returns the exposed columns', async () => {
      const data = {
        taskId: 5,
        uploadedById: 7,
        storageKey: attachment.storageKey,
        filename: attachment.filename,
        size: 1024,
        mimeType: 'image/png',
      };

      await expect(repository.create(data)).resolves.toEqual(attachment);
      expect(prisma.taskAttachment.create).toHaveBeenCalledWith({
        data,
        select: attachmentSelect,
      });
    });
  });

  describe('findMany', () => {
    it('pages the attachments of a task, oldest first', async () => {
      await expect(repository.findMany({ taskId: 5 }, 20, 10)).resolves.toEqual(
        [attachment],
      );

      expect(prisma.taskAttachment.findMany).toHaveBeenCalledWith({
        where: { taskId: 5 },
        skip: 20,
        take: 10,
        orderBy: { id: 'asc' },
        select: attachmentSelect,
      });
    });
  });

  describe('count', () => {
    it('counts with the given filter', async () => {
      await expect(repository.count({ taskId: 5 })).resolves.toBe(1);
      expect(prisma.taskAttachment.count).toHaveBeenCalledWith({
        where: { taskId: 5 },
      });
    });
  });

  describe('findById', () => {
    it('looks the attachment up by primary key', async () => {
      await expect(repository.findById(1)).resolves.toEqual(attachment);
      expect(prisma.taskAttachment.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: attachmentSelect,
      });
    });

    it('returns null when there is no such attachment', async () => {
      prisma.taskAttachment.findUnique.mockResolvedValue(null);

      await expect(repository.findById(99)).resolves.toBeNull();
    });
  });

  describe('findByName', () => {
    it('looks the attachment up by filename', async () => {
      await expect(repository.findByName('diagram.png')).resolves.toEqual(
        attachment,
      );

      expect(prisma.taskAttachment.findFirst).toHaveBeenCalledWith({
        where: { filename: 'diagram.png' },
        select: attachmentSelect,
      });
    });
  });

  describe('findIdByName', () => {
    it('returns just the id', async () => {
      prisma.taskAttachment.findFirst.mockResolvedValue({ id: 3 });

      await expect(repository.findIdByName('diagram.png')).resolves.toBe(3);
      expect(prisma.taskAttachment.findFirst).toHaveBeenCalledWith({
        where: { filename: 'diagram.png' },
        select: { id: true },
      });
    });

    it('returns null when no attachment carries that name', async () => {
      prisma.taskAttachment.findFirst.mockResolvedValue(null);

      await expect(repository.findIdByName('missing.png')).resolves.toBeNull();
    });
  });

  describe('delete', () => {
    it('removes the row and returns the exposed columns', async () => {
      await expect(repository.delete(1)).resolves.toEqual(attachment);
      expect(prisma.taskAttachment.delete).toHaveBeenCalledWith({
        where: { id: 1 },
        select: attachmentSelect,
      });
    });
  });
});
