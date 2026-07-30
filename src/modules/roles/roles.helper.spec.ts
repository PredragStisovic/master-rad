import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { QueryRolesDto } from './dto/query-roles.dto';
import { RoleEntity } from './entities/role.entity';
import { RolesHelper } from './roles.helper';
import { RolesRepository } from './roles.repository';

const role: RoleEntity = { id: 1, name: 'admin' };

const createRepositoryMock = () => ({
  findById: jest.fn().mockResolvedValue(role),
  findByName: jest.fn().mockResolvedValue(null),
  countUsers: jest.fn().mockResolvedValue(0),
});

describe('RolesHelper', () => {
  let helper: RolesHelper;
  let repository: ReturnType<typeof createRepositoryMock>;

  beforeEach(async () => {
    const repositoryMock = createRepositoryMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesHelper,
        { provide: RolesRepository, useValue: repositoryMock },
      ],
    }).compile();

    helper = module.get(RolesHelper);
    repository = repositoryMock;
  });

  describe('buildWhere', () => {
    const query = (overrides: Partial<QueryRolesDto> = {}) =>
      Object.assign(new QueryRolesDto(), overrides);

    it('returns an empty filter when nothing is requested', () => {
      expect(helper.buildWhere(query())).toEqual({});
    });

    it('searches the name case-insensitively', () => {
      expect(helper.buildWhere(query({ search: 'adm' }))).toEqual({
        name: { contains: 'adm', mode: 'insensitive' },
      });
    });
  });

  describe('getExistingRole', () => {
    it('returns the role', async () => {
      await expect(helper.getExistingRole(1)).resolves.toEqual(role);
    });

    it('throws when the role is missing', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(helper.getExistingRole(99)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('assertNameIsFree', () => {
    it('passes when the name is unused', async () => {
      await expect(helper.assertNameIsFree(role.name)).resolves.toBeUndefined();
    });

    it('throws when the name belongs to another role', async () => {
      repository.findByName.mockResolvedValue(role);

      await expect(helper.assertNameIsFree(role.name)).rejects.toThrow(
        ConflictException,
      );
    });

    it('passes when the name belongs to the edited role', async () => {
      repository.findByName.mockResolvedValue(role);

      await expect(
        helper.assertNameIsFree(role.name, role.id),
      ).resolves.toBeUndefined();
    });
  });

  describe('assertRoleIsUnassigned', () => {
    it('passes when no user holds the role', async () => {
      await expect(
        helper.assertRoleIsUnassigned(role.id),
      ).resolves.toBeUndefined();
    });

    it('throws when the role is still assigned', async () => {
      repository.countUsers.mockResolvedValue(2);

      await expect(helper.assertRoleIsUnassigned(role.id)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
