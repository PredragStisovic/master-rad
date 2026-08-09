import { Test, TestingModule } from '@nestjs/testing';
import { TaskPriority, TaskStatus } from '../../../generated/prisma/client';
import { ProjectEntity } from '../projects/entities/project.entity';
import { ProjectsRepository } from '../projects/projects.repository';
import { TaskEntity } from '../tasks/entities/task.entity';
import { TasksRepository } from '../tasks/tasks.repository';
import { QuerySearchDto, SearchScope } from './dto/query-search.dto';
import { SearchHelper } from './search.helper';
import { SearchService } from './search.service';

const project: ProjectEntity = {
  id: 1,
  name: 'Migration work',
  description: null,
  ownerId: 7,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

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

const projectWhere = { AND: [{ ownerId: 7 }] };
const taskWhere = { project: { ownerId: 7 } };

const query = (overrides: Partial<QuerySearchDto> = {}): QuerySearchDto =>
  Object.assign(new QuerySearchDto(), { q: 'migration' }, overrides);

const createProjectsRepositoryMock = () => ({
  findMany: jest.fn().mockResolvedValue([project]),
  count: jest.fn().mockResolvedValue(1),
});

const createTasksRepositoryMock = () => ({
  findMany: jest.fn().mockResolvedValue([task]),
  count: jest.fn().mockResolvedValue(1),
});

const createHelperMock = () => ({
  buildProjectWhere: jest.fn().mockReturnValue(projectWhere),
  buildTaskWhere: jest.fn().mockReturnValue(taskWhere),
  toPage: jest.fn((data: unknown[], total: number) => ({
    data,
    meta: { total, page: 1, limit: 20, totalPages: 1 },
  })),
});

describe('SearchService', () => {
  let service: SearchService;
  let projectsRepository: ReturnType<typeof createProjectsRepositoryMock>;
  let tasksRepository: ReturnType<typeof createTasksRepositoryMock>;
  let helper: ReturnType<typeof createHelperMock>;

  beforeEach(async () => {
    const projectsRepositoryMock = createProjectsRepositoryMock();
    const tasksRepositoryMock = createTasksRepositoryMock();
    const helperMock = createHelperMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: ProjectsRepository, useValue: projectsRepositoryMock },
        { provide: TasksRepository, useValue: tasksRepositoryMock },
        { provide: SearchHelper, useValue: helperMock },
      ],
    }).compile();

    service = module.get(SearchService);
    projectsRepository = projectsRepositoryMock;
    tasksRepository = tasksRepositoryMock;
    helper = helperMock;
  });

  describe('search', () => {
    it('pages both collections with the caller-scoped filters', async () => {
      const result = await service.search(7, query({ page: 2, limit: 10 }));

      expect(result).toEqual({
        projects: {
          data: [project],
          meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
        },
        tasks: {
          data: [task],
          meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
        },
      });
      expect(projectsRepository.findMany).toHaveBeenCalledWith(
        projectWhere,
        10,
        10,
      );
      expect(tasksRepository.findMany).toHaveBeenCalledWith(
        taskWhere,
        [{ id: 'asc' }],
        10,
        10,
      );
    });

    it('counts each collection with the same filter it pages with', async () => {
      await service.search(7, query());

      expect(projectsRepository.count).toHaveBeenCalledWith(projectWhere);
      expect(tasksRepository.count).toHaveBeenCalledWith(taskWhere);
    });

    it('builds both filters from the caller, never from the query alone', async () => {
      const dto = query();

      await service.search(7, dto);

      expect(helper.buildProjectWhere).toHaveBeenCalledWith(7, dto);
      expect(helper.buildTaskWhere).toHaveBeenCalledWith(7, dto);
    });

    it('leaves tasks unqueried when the scope is projects', async () => {
      const result = await service.search(
        7,
        query({ type: SearchScope.PROJECTS }),
      );

      expect(result.tasks.data).toEqual([]);
      expect(tasksRepository.findMany).not.toHaveBeenCalled();
      expect(tasksRepository.count).not.toHaveBeenCalled();
    });

    it('leaves projects unqueried when the scope is tasks', async () => {
      const result = await service.search(
        7,
        query({ type: SearchScope.TASKS }),
      );

      expect(result.projects.data).toEqual([]);
      expect(projectsRepository.findMany).not.toHaveBeenCalled();
      expect(projectsRepository.count).not.toHaveBeenCalled();
    });

    it('reports a zero total for the excluded collection', async () => {
      await service.search(7, query({ type: SearchScope.TASKS }));

      expect(helper.toPage).toHaveBeenCalledWith([], 0, expect.anything());
    });
  });
});
