import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ProjectRole,
  TaskPriority,
  TaskStatus,
} from '../../../generated/prisma/client';
import { ProjectMemberEntity } from '../project-members/entities/project-member.entity';
import { ProjectMembersRepository } from '../project-members/project-members.repository';
import { QueryTasksDto, SortOrder, TaskSortBy } from './dto/query-tasks.dto';
import { TasksHelper } from './tasks.helper';

const member: ProjectMemberEntity = {
  id: 1,
  projectId: 1,
  userId: 7,
  role: ProjectRole.MEMBER,
  joinedAt: new Date('2026-01-01'),
};

const buildQuery = (overrides: Partial<QueryTasksDto> = {}): QueryTasksDto =>
  Object.assign(new QueryTasksDto(), overrides);

const createMembersRepositoryMock = () => ({
  findByProjectAndUser: jest.fn().mockResolvedValue(member),
});

describe('TasksHelper', () => {
  let helper: TasksHelper;
  let membersRepository: ReturnType<typeof createMembersRepositoryMock>;

  beforeEach(async () => {
    const membersRepositoryMock = createMembersRepositoryMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksHelper,
        {
          provide: ProjectMembersRepository,
          useValue: membersRepositoryMock,
        },
      ],
    }).compile();

    helper = module.get(TasksHelper);
    membersRepository = membersRepositoryMock;
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
