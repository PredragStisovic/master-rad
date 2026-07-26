import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { QueryUsersDto } from './dto/query-users.dto';
import { UserEntity } from './entities/user.entity';
import { UsersHelper } from './users.helper';
import { UsersRepository } from './users.repository';

const user: UserEntity = {
  id: 1,
  email: 'jane.doe@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  roleId: 1,
};

const createRepositoryMock = () => ({
  findById: jest.fn().mockResolvedValue(user),
  findByEmail: jest.fn().mockResolvedValue(null),
  roleExists: jest.fn().mockResolvedValue(true),
});

describe('UsersHelper', () => {
  let helper: UsersHelper;
  let repository: ReturnType<typeof createRepositoryMock>;

  beforeEach(async () => {
    const repositoryMock = createRepositoryMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersHelper,
        { provide: UsersRepository, useValue: repositoryMock },
      ],
    }).compile();

    helper = module.get(UsersHelper);
    repository = repositoryMock;
  });

  describe('buildWhere', () => {
    const query = (overrides: Partial<QueryUsersDto> = {}) =>
      Object.assign(new QueryUsersDto(), overrides);

    it('returns an empty filter when nothing is requested', () => {
      expect(helper.buildWhere(query())).toEqual({});
    });

    it('filters by role', () => {
      expect(helper.buildWhere(query({ roleId: 2 }))).toEqual({ roleId: 2 });
    });

    it('searches email, first name and last name case-insensitively', () => {
      expect(helper.buildWhere(query({ search: 'jane' }))).toEqual({
        OR: [
          { email: { contains: 'jane', mode: 'insensitive' } },
          { firstName: { contains: 'jane', mode: 'insensitive' } },
          { lastName: { contains: 'jane', mode: 'insensitive' } },
        ],
      });
    });
  });

  describe('getExistingUser', () => {
    it('returns the user', async () => {
      await expect(helper.getExistingUser(1)).resolves.toEqual(user);
    });

    it('throws when the user is missing', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(helper.getExistingUser(99)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('assertEmailIsFree', () => {
    it('passes when the email is unused', async () => {
      await expect(
        helper.assertEmailIsFree(user.email),
      ).resolves.toBeUndefined();
    });

    it('throws when the email belongs to somebody else', async () => {
      repository.findByEmail.mockResolvedValue(user);

      await expect(helper.assertEmailIsFree(user.email)).rejects.toThrow(
        ConflictException,
      );
    });

    it('passes when the email belongs to the ignored user', async () => {
      repository.findByEmail.mockResolvedValue(user);

      await expect(
        helper.assertEmailIsFree(user.email, user.id),
      ).resolves.toBeUndefined();
    });
  });

  describe('assertRoleExists', () => {
    it('passes for a known role', async () => {
      await expect(helper.assertRoleExists(1)).resolves.toBeUndefined();
    });

    it('throws for an unknown role', async () => {
      repository.roleExists.mockResolvedValue(false);

      await expect(helper.assertRoleExists(42)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
