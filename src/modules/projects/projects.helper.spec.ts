import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { ProjectEntity } from './entities/project.entity';
import { ProjectsHelper } from './projects.helper';
import { ProjectsRepository } from './projects.repository';

const project: ProjectEntity = {
  id: 1,
  name: 'Alpha',
  description: null,
  ownerId: 1,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const createRepositoryMock = () => ({
  findById: jest.fn().mockResolvedValue(project),
});

describe('ProjectsHelper', () => {
  let helper: ProjectsHelper;
  let repository: ReturnType<typeof createRepositoryMock>;

  beforeEach(async () => {
    const repositoryMock = createRepositoryMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsHelper,
        { provide: ProjectsRepository, useValue: repositoryMock },
      ],
    }).compile();

    helper = module.get(ProjectsHelper);
    repository = repositoryMock;
  });

  describe('buildWhere', () => {
    const query = (overrides: Partial<QueryProjectsDto> = {}) =>
      Object.assign(new QueryProjectsDto(), overrides);

    it('returns an empty filter when nothing is requested', () => {
      expect(helper.buildWhere(query())).toEqual({});
    });

    it('filters by ownerId', () => {
      expect(helper.buildWhere(query({ ownerId: 2 }))).toEqual({ ownerId: 2 });
    });

    it('searches name and description case-insensitively', () => {
      expect(helper.buildWhere(query({ search: 'alp' }))).toEqual({
        OR: [
          { name: { contains: 'alp', mode: 'insensitive' } },
          { description: { contains: 'alp', mode: 'insensitive' } },
        ],
      });
    });

    it('combines ownerId and search', () => {
      const result = helper.buildWhere(query({ ownerId: 1, search: 'alp' }));

      expect(result.ownerId).toBe(1);
      expect(result.OR).toBeDefined();
    });
  });

  describe('getExistingProject', () => {
    it('returns the project', async () => {
      await expect(helper.getExistingProject(1)).resolves.toEqual(project);
    });

    it('throws when the project is missing', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(helper.getExistingProject(99)).rejects.toThrow(NotFoundException);
    });
  });
});
