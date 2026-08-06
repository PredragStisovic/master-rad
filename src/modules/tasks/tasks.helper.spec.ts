import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ProjectRole,
  TaskPriority,
  TaskStatus,
} from '../../../generated/prisma/client';
import { ProjectMemberEntity } from '../project-members/entities/project-member.entity';
import { ProjectMembersRepository } from '../project-members/project-members.repository';
import { ProjectEntity } from '../projects/entities/project.entity';
import { ProjectsRepository } from '../projects/projects.repository';
import { QueryTasksDto, SortOrder, TaskSortBy } from './dto/query-tasks.dto';
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
  assigneeId: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const member: ProjectMemberEntity = {
  id: 1,
  projectId: 1,
  userId: 7,
  role: ProjectRole.MEMBER,
  joinedAt: new Date('2026-01-01'),
};

const buildQuery = (overrides: Partial<QueryTasksDto> = {}): QueryTasksDto =>
  Object.assign(new QueryTasksDto(), overrides);

const createTasksRepositoryMock = () => ({
  findById: jest.fn().mockResolvedValue(task),
});

const createProjectsRepositoryMock = () => ({
  findById: jest.fn().mockResolvedValue(project),
});

const createMembersRepositoryMock = () => ({
  findByProjectAndUser: jest.fn().mockResolvedValue(member),
});

describe('TasksHelper', () => {
  let helper: TasksHelper;
  let tasksRepository: ReturnType<typeof createTasksRepositoryMock>;
  let projectsRepository: ReturnType<typeof createProjectsRepositoryMock>;
  let membersRepository: ReturnType<typeof createMembersRepositoryMock>;

  beforeEach(async () => {
    const tasksRepositoryMock = createTasksRepositoryMock();
    const projectsRepositoryMock = createProjectsRepositoryMock();
    const membersRepositoryMock = createMembersRepositoryMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksHelper,
        { provide: TasksRepository, useValue: tasksRepositoryMock },
        { provide: ProjectsRepository, useValue: projectsRepositoryMock },
        {
          provide: ProjectMembersRepository,
          useValue: membersRepositoryMock,
        },
      ],
    }).compile();

    helper = module.get(TasksHelper);
    tasksRepository = tasksRepositoryMock;
    projectsRepository = projectsRepositoryMock;
    membersRepository = membersRepositoryMock;
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

  describe('buildWhere', () => {
    it('scopes to the project when no filter is given', () => {
      expect(helper.buildWhere(1, buildQuery())).toEqual({ projectId: 1 });
    });

    it('adds each filter that is present', () => {
      const where = helper.buildWhere(
        1,
        buildQuery({
          status: TaskStatus.IN_REVIEW,
          priority: TaskPriority.HIGH,
          assigneeId: 7,
        }),
      );

      expect(where).toEqual({
        projectId: 1,
        status: TaskStatus.IN_REVIEW,
        priority: TaskPriority.HIGH,
        assigneeId: 7,
      });
    });

    it('leaves out the filters that are absent', () => {
      const where = helper.buildWhere(
        1,
        buildQuery({ status: TaskStatus.DONE }),
      );

      expect(where).toEqual({ projectId: 1, status: TaskStatus.DONE });
    });
  });

  describe('buildOrderBy', () => {
    it('orders by ascending id by default', () => {
      expect(helper.buildOrderBy(buildQuery())).toEqual([{ id: 'asc' }]);
    });

    it('honours the requested direction on the default column', () => {
      expect(
        helper.buildOrderBy(buildQuery({ sortOrder: SortOrder.DESC })),
      ).toEqual([{ id: 'desc' }]);
    });

    it('breaks ties on id when sorting by another column', () => {
      expect(
        helper.buildOrderBy(
          buildQuery({
            sortBy: TaskSortBy.PRIORITY,
            sortOrder: SortOrder.DESC,
          }),
        ),
      ).toEqual([{ priority: 'desc' }, { id: 'asc' }]);
    });

    it('supports every allowed sort column', () => {
      const columns = Object.values(TaskSortBy).map(
        (sortBy) =>
          Object.keys(helper.buildOrderBy(buildQuery({ sortBy }))[0])[0],
      );

      expect(columns).toEqual([
        'id',
        'title',
        'status',
        'priority',
        'createdAt',
        'updatedAt',
      ]);
    });
  });

  describe('assertUserIsProjectMember', () => {
    it('passes when the user is a member of the project', async () => {
      await expect(
        helper.assertUserIsProjectMember(1, 7),
      ).resolves.toBeUndefined();
      expect(membersRepository.findByProjectAndUser).toHaveBeenCalledWith(1, 7);
    });

    it('throws when the user is not a member of the project', async () => {
      membersRepository.findByProjectAndUser.mockResolvedValue(null);

      await expect(helper.assertUserIsProjectMember(1, 99)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
