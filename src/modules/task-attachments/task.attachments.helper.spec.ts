import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TaskPriority, TaskStatus } from '../../../generated/prisma/client';
import { ProjectMembersRepository } from '../project-members/project-members.repository';
import { ProjectsRepository } from '../projects/projects.repository';
import { TaskEntity } from '../tasks/entities/task.entity';
import { TasksRepository } from '../tasks/tasks.repository';
import { TaskAttachmentsHelper } from './task.attachments.helper';

/** The parts of an uploaded file the attachment code actually reads. */
const multerFile = (
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File =>
  ({
    fieldname: 'files',
    originalname: 'diagram.png',
    encoding: '7bit',
    mimetype: 'image/png',
    size: 1024,
    buffer: Buffer.from('a png, honestly'),
    ...overrides,
  }) as Express.Multer.File;

const OWNER_ID = 7;
const MEMBER_ID = 8;
const OUTSIDER_ID = 9;

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

const project = { id: 1, name: 'Master rad', ownerId: OWNER_ID };

const membership = { projectId: 1, userId: MEMBER_ID };

const createTasksRepositoryMock = () => ({
  findById: jest.fn().mockResolvedValue(task),
});

const createProjectsRepositoryMock = () => ({
  findById: jest.fn().mockResolvedValue(project),
});

const createMembersRepositoryMock = () => ({
  findByProjectAndUser: jest.fn().mockResolvedValue(null),
});

describe('TaskAttachmentsHelper', () => {
  let helper: TaskAttachmentsHelper;
  let tasksRepository: ReturnType<typeof createTasksRepositoryMock>;
  let projectsRepository: ReturnType<typeof createProjectsRepositoryMock>;
  let membersRepository: ReturnType<typeof createMembersRepositoryMock>;

  beforeEach(async () => {
    const tasksRepositoryMock = createTasksRepositoryMock();
    const projectsRepositoryMock = createProjectsRepositoryMock();
    const membersRepositoryMock = createMembersRepositoryMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskAttachmentsHelper,
        { provide: TasksRepository, useValue: tasksRepositoryMock },
        { provide: ProjectsRepository, useValue: projectsRepositoryMock },
        { provide: ProjectMembersRepository, useValue: membersRepositoryMock },
      ],
    }).compile();

    helper = module.get(TaskAttachmentsHelper);
    tasksRepository = tasksRepositoryMock;
    projectsRepository = projectsRepositoryMock;
    membersRepository = membersRepositoryMock;
  });

  describe('assertTaskIsAccessible', () => {
    it('passes for the owner of the project the task belongs to', async () => {
      await expect(
        helper.assertTaskIsAccessible(5, OWNER_ID),
      ).resolves.toBeUndefined();

      expect(tasksRepository.findById).toHaveBeenCalledWith(5);
      expect(projectsRepository.findById).toHaveBeenCalledWith(task.projectId);
    });

    it('does not look up a membership for the owner', async () => {
      await helper.assertTaskIsAccessible(5, OWNER_ID);

      expect(membersRepository.findByProjectAndUser).not.toHaveBeenCalled();
    });

    it('passes for a member of the project', async () => {
      membersRepository.findByProjectAndUser.mockResolvedValue(membership);

      await expect(
        helper.assertTaskIsAccessible(5, MEMBER_ID),
      ).resolves.toBeUndefined();

      expect(membersRepository.findByProjectAndUser).toHaveBeenCalledWith(
        task.projectId,
        MEMBER_ID,
      );
    });

    it('throws when the task is missing', async () => {
      tasksRepository.findById.mockResolvedValue(null);

      await expect(helper.assertTaskIsAccessible(99, OWNER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects a user who neither owns the project nor belongs to it', async () => {
      await expect(
        helper.assertTaskIsAccessible(5, OUTSIDER_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects the caller when the project cannot be read', async () => {
      projectsRepository.findById.mockResolvedValue(null);

      await expect(helper.assertTaskIsAccessible(5, OWNER_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('toCreateInput', () => {
    it('maps the upload onto the columns of the row', () => {
      const file = multerFile({
        originalname: 'diagram.png',
        mimetype: 'image/png',
        size: 2048,
      });

      expect(helper.toCreateInput({ taskId: 5 }, file, 7, 'key-1')).toEqual({
        taskId: 5,
        uploadedById: 7,
        storageKey: 'key-1',
        filename: 'diagram.png',
        size: 2048,
        mimeType: 'image/png',
      });
    });

    it('keeps the storage key separate from the name the client sent', () => {
      const file = multerFile({ originalname: 'report.pdf' });

      const input = helper.toCreateInput({ taskId: 5 }, file, 7, 'key-2');

      expect(input.storageKey).toBe('key-2');
      expect(input.filename).toBe('report.pdf');
    });
  });
});
