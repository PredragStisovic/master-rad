import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { QueryUsersDto } from './dto/query-users.dto';
import { UserEntity } from './entities/user.entity';
import { UsersHelper } from './users.helper';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

const user: UserEntity = {
  id: 1,
  email: 'jane.doe@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  roleId: 1,
};

const createDto = { ...user, password: 'S3cretPassw0rd' };

const createRepositoryMock = () => ({
  create: jest.fn().mockResolvedValue(user),
  findMany: jest.fn().mockResolvedValue([user]),
  count: jest.fn().mockResolvedValue(1),
  update: jest.fn().mockResolvedValue(user),
  delete: jest.fn().mockResolvedValue(user),
});

const createHelperMock = () => ({
  buildWhere: jest.fn().mockReturnValue({}),
  getExistingUser: jest.fn().mockResolvedValue(user),
  assertEmailIsFree: jest.fn().mockResolvedValue(undefined),
  assertRoleExists: jest.fn().mockResolvedValue(undefined),
});

describe('UsersService', () => {
  let service: UsersService;
  let repository: ReturnType<typeof createRepositoryMock>;
  let helper: ReturnType<typeof createHelperMock>;

  beforeEach(async () => {
    const repositoryMock = createRepositoryMock();
    const helperMock = createHelperMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: repositoryMock },
        { provide: UsersHelper, useValue: helperMock },
      ],
    }).compile();

    service = module.get(UsersService);
    repository = repositoryMock;
    helper = helperMock;
  });

  describe('create', () => {
    it('validates the email and the role before persisting', async () => {
      await expect(service.create(createDto)).resolves.toEqual(user);

      expect(helper.assertEmailIsFree).toHaveBeenCalledWith(createDto.email);
      expect(helper.assertRoleExists).toHaveBeenCalledWith(createDto.roleId);
      expect(repository.create).toHaveBeenCalledWith(createDto);
    });

    it('does not persist when a guard rejects', async () => {
      helper.assertEmailIsFree.mockRejectedValue(new Error('taken'));

      await expect(service.create(createDto)).rejects.toThrow('taken');
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    const query = (overrides: Partial<QueryUsersDto> = {}) =>
      Object.assign(new QueryUsersDto(), overrides);

    it('returns a paginated result', async () => {
      repository.count.mockResolvedValue(25);

      await expect(service.findAll(query())).resolves.toEqual({
        data: [user],
        meta: { total: 25, page: 1, limit: 20, totalPages: 2 },
      });
    });

    it('queries with the filter built by the helper and the page offset', async () => {
      helper.buildWhere.mockReturnValue({ roleId: 2 });

      await service.findAll(query({ page: 3, limit: 10 }));

      expect(repository.findMany).toHaveBeenCalledWith({ roleId: 2 }, 20, 10);
      expect(repository.count).toHaveBeenCalledWith({ roleId: 2 });
    });
  });

  describe('findOne', () => {
    it('returns the user', async () => {
      await expect(service.findOne(1)).resolves.toEqual(user);
      expect(helper.getExistingUser).toHaveBeenCalledWith(1);
    });

    it('propagates the helper error when the user is missing', async () => {
      helper.getExistingUser.mockRejectedValue(new NotFoundException());

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates an existing user', async () => {
      await expect(service.update(1, { firstName: 'Janet' })).resolves.toEqual(
        user,
      );

      expect(helper.getExistingUser).toHaveBeenCalledWith(1);
      expect(repository.update).toHaveBeenCalledWith(1, {
        firstName: 'Janet',
      });
    });

    it('checks the email against everybody but the edited user', async () => {
      await service.update(1, { email: user.email });

      expect(helper.assertEmailIsFree).toHaveBeenCalledWith(user.email, 1);
    });

    it('validates a changed role', async () => {
      await service.update(1, { roleId: 2 });

      expect(helper.assertRoleExists).toHaveBeenCalledWith(2);
    });

    it('skips the guards when the fields are absent', async () => {
      await service.update(1, { firstName: 'Janet' });

      expect(helper.assertEmailIsFree).not.toHaveBeenCalled();
      expect(helper.assertRoleExists).not.toHaveBeenCalled();
    });

    it('does not persist when the user is missing', async () => {
      helper.getExistingUser.mockRejectedValue(new NotFoundException());

      await expect(service.update(99, { firstName: 'Janet' })).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes an existing user', async () => {
      await expect(service.remove(1)).resolves.toEqual(user);
      expect(repository.delete).toHaveBeenCalledWith(1);
    });

    it('does not delete when the user is missing', async () => {
      helper.getExistingUser.mockRejectedValue(new NotFoundException());

      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
