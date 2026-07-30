import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { QueryRolesDto } from './dto/query-roles.dto';
import { RoleEntity } from './entities/role.entity';
import { RolesHelper } from './roles.helper';
import { RolesRepository } from './roles.repository';
import { RolesService } from './roles.service';

const role: RoleEntity = { id: 1, name: 'admin' };

const createRepositoryMock = () => ({
  create: jest.fn().mockResolvedValue(role),
  findMany: jest.fn().mockResolvedValue([role]),
  count: jest.fn().mockResolvedValue(1),
  update: jest.fn().mockResolvedValue(role),
  delete: jest.fn().mockResolvedValue(role),
});

const createHelperMock = () => ({
  buildWhere: jest.fn().mockReturnValue({}),
  getExistingRole: jest.fn().mockResolvedValue(role),
  assertNameIsFree: jest.fn().mockResolvedValue(undefined),
  assertRoleIsUnassigned: jest.fn().mockResolvedValue(undefined),
});

describe('RolesService', () => {
  let service: RolesService;
  let repository: ReturnType<typeof createRepositoryMock>;
  let helper: ReturnType<typeof createHelperMock>;

  beforeEach(async () => {
    const repositoryMock = createRepositoryMock();
    const helperMock = createHelperMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: RolesRepository, useValue: repositoryMock },
        { provide: RolesHelper, useValue: helperMock },
      ],
    }).compile();

    service = module.get(RolesService);
    repository = repositoryMock;
    helper = helperMock;
  });

  describe('create', () => {
    it('validates the name before persisting', async () => {
      await expect(service.create({ name: role.name })).resolves.toEqual(role);

      expect(helper.assertNameIsFree).toHaveBeenCalledWith(role.name);
      expect(repository.create).toHaveBeenCalledWith({ name: role.name });
    });

    it('does not persist when the name is taken', async () => {
      helper.assertNameIsFree.mockRejectedValue(new ConflictException());

      await expect(service.create({ name: role.name })).rejects.toThrow(
        ConflictException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    const query = (overrides: Partial<QueryRolesDto> = {}) =>
      Object.assign(new QueryRolesDto(), overrides);

    it('returns a paginated result', async () => {
      repository.count.mockResolvedValue(25);

      await expect(service.findAll(query())).resolves.toEqual({
        data: [role],
        meta: { total: 25, page: 1, limit: 20, totalPages: 2 },
      });
    });

    it('queries with the filter built by the helper and the page offset', async () => {
      helper.buildWhere.mockReturnValue({ name: { contains: 'adm' } });

      await service.findAll(query({ page: 3, limit: 10 }));

      expect(repository.findMany).toHaveBeenCalledWith(
        { name: { contains: 'adm' } },
        20,
        10,
      );
      expect(repository.count).toHaveBeenCalledWith({
        name: { contains: 'adm' },
      });
    });
  });

  describe('findOne', () => {
    it('returns the role', async () => {
      await expect(service.findOne(1)).resolves.toEqual(role);
      expect(helper.getExistingRole).toHaveBeenCalledWith(1);
    });

    it('propagates the helper error when the role is missing', async () => {
      helper.getExistingRole.mockRejectedValue(new NotFoundException());

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates an existing role', async () => {
      await expect(service.update(1, { name: 'manager' })).resolves.toEqual(
        role,
      );

      expect(helper.getExistingRole).toHaveBeenCalledWith(1);
      expect(repository.update).toHaveBeenCalledWith(1, { name: 'manager' });
    });

    it('checks the name against every role but the edited one', async () => {
      await service.update(1, { name: 'manager' });

      expect(helper.assertNameIsFree).toHaveBeenCalledWith('manager', 1);
    });

    it('skips the name guard when the field is absent', async () => {
      await service.update(1, {});

      expect(helper.assertNameIsFree).not.toHaveBeenCalled();
    });

    it('does not persist when the role is missing', async () => {
      helper.getExistingRole.mockRejectedValue(new NotFoundException());

      await expect(service.update(99, { name: 'manager' })).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes an existing, unassigned role', async () => {
      await expect(service.remove(1)).resolves.toEqual(role);

      expect(helper.assertRoleIsUnassigned).toHaveBeenCalledWith(1);
      expect(repository.delete).toHaveBeenCalledWith(1);
    });

    it('does not delete when the role is missing', async () => {
      helper.getExistingRole.mockRejectedValue(new NotFoundException());

      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('does not delete when the role is still assigned', async () => {
      helper.assertRoleIsUnassigned.mockRejectedValue(new ConflictException());

      await expect(service.remove(1)).rejects.toThrow(ConflictException);
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
