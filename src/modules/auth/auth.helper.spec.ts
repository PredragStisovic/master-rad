import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RefreshToken } from '../../../generated/prisma/client';
import { RolesRepository } from '../roles/roles.repository';
import { UserEntity } from '../users/entities/user.entity';
import { AuthHelper } from './auth.helper';
import { RefreshTokenRepository } from './refresh-token.repository';

const inAnHour = () => new Date(Date.now() + 60 * 60 * 1000);
const anHourAgo = () => new Date(Date.now() - 60 * 60 * 1000);

const refreshToken: RefreshToken = {
  id: 7,
  userId: 1,
  tokenHash: 'hash',
  expiresAt: inAnHour(),
  revokedAt: null,
};

const user: UserEntity = {
  id: 1,
  email: 'jane.doe@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  roleId: 2,
};

const createRepositoryMock = () => ({
  saveTokenHash: jest.fn().mockResolvedValue(undefined),
  findToken: jest.fn().mockResolvedValue(refreshToken),
});

const createRolesRepositoryMock = () => ({
  findById: jest.fn().mockResolvedValue({ id: 2, name: 'user' }),
});

describe('AuthHelper', () => {
  let helper: AuthHelper;
  let repository: ReturnType<typeof createRepositoryMock>;
  let rolesRepository: ReturnType<typeof createRolesRepositoryMock>;

  beforeEach(async () => {
    const repositoryMock = createRepositoryMock();
    const rolesRepositoryMock = createRolesRepositoryMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthHelper,
        { provide: RefreshTokenRepository, useValue: repositoryMock },
        { provide: RolesRepository, useValue: rolesRepositoryMock },
      ],
    }).compile();

    helper = module.get(AuthHelper);
    repository = repositoryMock;
    rolesRepository = rolesRepositoryMock;
  });

  describe('buildAccessTokenPayload', () => {
    it('carries the resolved role name alongside the user identity', async () => {
      await expect(helper.buildAccessTokenPayload(user)).resolves.toEqual({
        sub: 1,
        email: 'jane.doe@example.com',
        roleId: 2,
        role: 'user',
      });

      expect(rolesRepository.findById).toHaveBeenCalledWith(2);
    });

    it('refuses to mint a token when the role no longer exists', async () => {
      rolesRepository.findById.mockResolvedValue(null);

      await expect(helper.buildAccessTokenPayload(user)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getActiveRefreshToken', () => {
    it('looks the token up by its hash for the given user', async () => {
      await expect(
        helper.getActiveRefreshToken('raw-token', 1),
      ).resolves.toEqual(refreshToken);

      expect(repository.findToken).toHaveBeenCalledWith(
        helper.hashToken('raw-token'),
        1,
      );
    });

    it('rejects a token that is unknown or already revoked', async () => {
      repository.findToken.mockResolvedValue(null);

      await expect(
        helper.getActiveRefreshToken('raw-token', 1),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an expired token', async () => {
      repository.findToken.mockResolvedValue({
        ...refreshToken,
        expiresAt: anHourAgo(),
      });

      await expect(
        helper.getActiveRefreshToken('raw-token', 1),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
