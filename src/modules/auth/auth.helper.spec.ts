import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RefreshToken } from '../../../generated/prisma/client';
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

const createRepositoryMock = () => ({
  saveTokenHash: jest.fn().mockResolvedValue(undefined),
  findToken: jest.fn().mockResolvedValue(refreshToken),
});

describe('AuthHelper', () => {
  let helper: AuthHelper;
  let repository: ReturnType<typeof createRepositoryMock>;

  beforeEach(async () => {
    const repositoryMock = createRepositoryMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthHelper,
        { provide: RefreshTokenRepository, useValue: repositoryMock },
      ],
    }).compile();

    helper = module.get(AuthHelper);
    repository = repositoryMock;
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
