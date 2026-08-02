import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { ProjectEntity } from './entities/project.entity';
import { ProjectsHelper } from './projects.helper';
import { ProjectsRepository } from './projects.repository';
import { ProjectsService } from './projects.service';

const project: ProjectEntity = {
  id: 1,
  name: 'Alpha',
  description: null,
  ownerId: 1,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const createRepositoryMock = () => ({
  create: jest.fn().mockResolvedValue(project),
  findMany: jest.fn().mockResolvedValue([project]),
  count: jest.fn().mockResolvedValue(1),
  update: jest.fn().mockResolvedValue(project),
  delete: jest.fn().mockResolvedValue(project),
});

const createHelperMock = () => ({
  buildWhere: jest.fn().mockReturnValue({}),
  getExistingProject: jest.fn().mockResolvedValue(project),
});

describe('ProjectsService', () => {
  let service: ProjectsService;
  let repository: ReturnType<typeof createRepositoryMock>;
  let helper: ReturnType<typeof createHelperMock>;

  beforeEach(async () => {
    const repositoryMock = createRepositoryMock();
    const helperMock = createHelperMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: ProjectsRepository, useValue: repositoryMock },
        { provide: ProjectsHelper, useValue: helperMock },
      ],
    }).compile();

    service = module.get(ProjectsService);
    repository = repositoryMock;
    helper = helperMock;
  });

  describe('create', () => {
    it('persists the project with the given owner', async () => {
      await expect(service.create({ name: 'Alpha' }, 1)).resolves.toEqual(
        project,
      );

      expect(repository.create).toHaveBeenCalledWith({
        name: 'Alpha',
        ownerId: 1,
      });
    });
  });

  describe('findAll', () => {
    const query = (overrides: Partial<QueryProjectsDto> = {}) =>
      Object.assign(new QueryProjectsDto(), overrides);

    it('returns a paginated result', async () => {
      repository.count.mockResolvedValue(25);

      await expect(service.findAll(query())).resolves.toEqual({
        data: [project],
        meta: { total: 25, page: 1, limit: 20, totalPages: 2 },
      });
    });

    it('passes the built filter and page offset to the repository', async () => {
      helper.buildWhere.mockReturnValue({ ownerId: 2 });

      await service.findAll(query({ page: 2, limit: 10 }));

      expect(repository.findMany).toHaveBeenCalledWith({ ownerId: 2 }, 10, 10);
      expect(repository.count).toHaveBeenCalledWith({ ownerId: 2 });
    });
  });

  describe('findOne', () => {
    it('returns the project', async () => {
      await expect(service.findOne(1)).resolves.toEqual(project);
      expect(helper.getExistingProject).toHaveBeenCalledWith(1);
    });

    it('propagates the helper error when the project is missing', async () => {
      helper.getExistingProject.mockRejectedValue(new NotFoundException());

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates an existing project', async () => {
      await expect(service.update(1, { name: 'Beta' })).resolves.toEqual(
        project,
      );

      expect(helper.getExistingProject).toHaveBeenCalledWith(1);
      expect(repository.update).toHaveBeenCalledWith(1, { name: 'Beta' });
    });

    it('does not persist when the project is missing', async () => {
      helper.getExistingProject.mockRejectedValue(new NotFoundException());

      await expect(service.update(99, { name: 'Beta' })).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes an existing project', async () => {
      await expect(service.remove(1)).resolves.toEqual(project);

      expect(helper.getExistingProject).toHaveBeenCalledWith(1);
      expect(repository.delete).toHaveBeenCalledWith(1);
    });

    it('does not delete when the project is missing', async () => {
      helper.getExistingProject.mockRejectedValue(new NotFoundException());

      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
