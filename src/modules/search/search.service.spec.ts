import { Test, TestingModule } from '@nestjs/testing';
import { TaskPriority, TaskStatus } from '../../../generated/prisma/client';
import { ProjectEntity } from '../projects/entities/project.entity';
import { TaskEntity } from '../tasks/entities/task.entity';
import { QuerySearchDto, SearchScope } from './dto/query-search.dto';
import { SearchHelper } from './search.helper';
import { SearchRepository } from './search.repository';
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

const query = (overrides: Partial<QuerySearchDto> = {}): QuerySearchDto =>
  Object.assign(new QuerySearchDto(), { q: 'migration' }, overrides);

const createRepositoryMock = () => ({
  findProjects: jest.fn().mockResolvedValue([project]),
  countProjects: jest.fn().mockResolvedValue(1),
  findTasks: jest.fn().mockResolvedValue([task]),
  countTasks: jest.fn().mockResolvedValue(1),
});

const createHelperMock = () => ({
  toPage: jest.fn((data: unknown[], total: number) => ({
    data,
    meta: { total, page: 1, limit: 20, totalPages: 1 },
  })),
});

describe('SearchService', () => {
  let service: SearchService;
  let repository: ReturnType<typeof createRepositoryMock>;
  let helper: ReturnType<typeof createHelperMock>;

  beforeEach(async () => {
    const repositoryMock = createRepositoryMock();
    const helperMock = createHelperMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: SearchRepository, useValue: repositoryMock },
        { provide: SearchHelper, useValue: helperMock },
      ],
    }).compile();

    service = module.get(SearchService);
    repository = repositoryMock;
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
      expect(repository.findProjects).toHaveBeenCalledWith(
        7,
        'migration',
        10,
        10,
      );
      expect(repository.findTasks).toHaveBeenCalledWith(7, 'migration', 10, 10);
    });

    it('counts each collection with the same term and caller it pages with', async () => {
      await service.search(7, query());

      expect(repository.countProjects).toHaveBeenCalledWith(7, 'migration');
      expect(repository.countTasks).toHaveBeenCalledWith(7, 'migration');
    });

    it('scopes every read to the caller, never to the term alone', async () => {
      await service.search(7, query());

      for (const read of [
        repository.findProjects,
        repository.countProjects,
        repository.findTasks,
        repository.countTasks,
      ]) {
        const [callerId] = read.mock.calls[0] as [number, ...unknown[]];

        expect(callerId).toBe(7);
      }
    });

    it('leaves tasks unqueried when the scope is projects', async () => {
      const result = await service.search(
        7,
        query({ type: SearchScope.PROJECTS }),
      );

      expect(result.tasks.data).toEqual([]);
      expect(repository.findTasks).not.toHaveBeenCalled();
      expect(repository.countTasks).not.toHaveBeenCalled();
    });

    it('leaves projects unqueried when the scope is tasks', async () => {
      const result = await service.search(
        7,
        query({ type: SearchScope.TASKS }),
      );

      expect(result.projects.data).toEqual([]);
      expect(repository.findProjects).not.toHaveBeenCalled();
      expect(repository.countProjects).not.toHaveBeenCalled();
    });

    it('reports a zero total for the excluded collection', async () => {
      await service.search(7, query({ type: SearchScope.TASKS }));

      expect(helper.toPage).toHaveBeenCalledWith([], 0, expect.anything());
    });
  });
});
