import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { RefreshToken } from '../../../generated/prisma/client';
import { UsersService } from '../users/users.service';
import { AuthHelper } from './auth.helper';
import { AuthService } from './auth.service';
import { RefreshTokenRepository } from './refresh-token.repository';

const refreshToken: RefreshToken = {
  id: 7,
  userId: 1,
  tokenHash: 'hash',
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  revokedAt: null,
};

const createHelperMock = () => ({
  getActiveRefreshToken: jest.fn().mockResolvedValue(refreshToken),
});

const createRepositoryMock = () => ({
  revokeToken: jest.fn().mockResolvedValue(undefined),
});

describe('AuthService', () => {
  let service: AuthService;
  let helper: ReturnType<typeof createHelperMock>;
  let repository: ReturnType<typeof createRepositoryMock>;

  beforeEach(async () => {
    const helperMock = createHelperMock();
    const repositoryMock = createRepositoryMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthHelper, useValue: helperMock },
        { provide: RefreshTokenRepository, useValue: repositoryMock },
        { provide: UsersService, useValue: {} },
        { provide: JwtService, useValue: {} },
      ],
    }).compile();

    service = module.get(AuthService);
    helper = helperMock;
    repository = repositoryMock;
  });

  describe('logout', () => {
    it('revokes the refresh token of the authenticated user', async () => {
      await expect(
        service.logout(1, { refreshToken: 'raw-token' }),
      ).resolves.toBeUndefined();

      expect(helper.getActiveRefreshToken).toHaveBeenCalledWith('raw-token', 1);
      expect(repository.revokeToken).toHaveBeenCalledWith(refreshToken.id);
    });

    it('does not revoke anything when the token is not usable', async () => {
      helper.getActiveRefreshToken.mockRejectedValue(
        new UnauthorizedException(),
      );

      await expect(
        service.logout(1, { refreshToken: 'raw-token' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(repository.revokeToken).not.toHaveBeenCalled();
    });
  });
});
