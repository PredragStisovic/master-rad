import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { RefreshToken } from '../../../generated/prisma/client';
import { UserEntity } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthHelper } from './auth.helper';
import { AuthService } from './auth.service';
import { RefreshTokenRepository } from './refresh-token.repository';

const anHourAgo = () => new Date(Date.now() - 60 * 60 * 1000);

const refreshToken: RefreshToken = {
  id: 7,
  userId: 1,
  tokenHash: 'hash',
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  revokedAt: null,
  rotatedAt: null,
  familyId: 'family-1',
};

const user: UserEntity = {
  id: 1,
  email: 'jane.doe@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  roleId: 2,
};

const payload = {
  sub: 1,
  email: user.email,
  roleId: 2,
  role: 'user',
};

const createHelperMock = () => ({
  getActiveRefreshToken: jest.fn().mockResolvedValue(refreshToken),
  buildAccessTokenPayload: jest.fn().mockResolvedValue(payload),
  createAndSaveRefreshToken: jest.fn().mockResolvedValue('raw-token'),
  hashToken: jest.fn().mockReturnValue('hash'),
});

const createRepositoryMock = () => ({
  findToken: jest.fn().mockResolvedValue(refreshToken),
  revokeToken: jest.fn().mockResolvedValue(undefined),
  revokeTokenFamily: jest.fn().mockResolvedValue(undefined),
});

const createUsersServiceMock = () => ({
  findOne: jest.fn().mockResolvedValue(user),
});

const createJwtServiceMock = () => ({
  sign: jest.fn().mockReturnValue('access-token'),
});

describe('AuthService', () => {
  let service: AuthService;
  let helper: ReturnType<typeof createHelperMock>;
  let repository: ReturnType<typeof createRepositoryMock>;
  let jwtService: ReturnType<typeof createJwtServiceMock>;

  beforeEach(async () => {
    const helperMock = createHelperMock();
    const repositoryMock = createRepositoryMock();
    const jwtServiceMock = createJwtServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthHelper, useValue: helperMock },
        { provide: RefreshTokenRepository, useValue: repositoryMock },
        { provide: UsersService, useValue: createUsersServiceMock() },
        { provide: JwtService, useValue: jwtServiceMock },
      ],
    }).compile();

    service = module.get(AuthService);
    helper = helperMock;
    repository = repositoryMock;
    jwtService = jwtServiceMock;
  });

  describe('loginUser', () => {
    it('opens a fresh token family for the logged in user', async () => {
      await expect(service.loginUser(user)).resolves.toEqual({
        access_token: 'access-token',
        refresh_token: 'raw-token',
      });

      expect(helper.createAndSaveRefreshToken).toHaveBeenCalledWith(
        user.id,
        expect.any(String),
      );
      expect(jwtService.sign).toHaveBeenCalledWith(payload);
    });

    it('gives every login its own family, so revoking one leaves the other alone', async () => {
      await service.loginUser(user);
      await service.loginUser(user);

      const [[, firstFamilyId], [, secondFamilyId]] =
        helper.createAndSaveRefreshToken.mock.calls;

      expect(firstFamilyId).not.toEqual(secondFamilyId);
    });
  });

  describe('refreshJwtToken', () => {
    it('rotates the presented token and keeps the new one in the same family', async () => {
      await expect(
        service.refreshJwtToken({ refreshToken: 'raw-token' }, user.id),
      ).resolves.toEqual({
        access_token: 'access-token',
        refresh_token: 'raw-token',
      });

      expect(repository.findToken).toHaveBeenCalledWith('hash', user.id);
      expect(repository.revokeToken).toHaveBeenCalledWith(refreshToken.id);
      expect(helper.createAndSaveRefreshToken).toHaveBeenCalledWith(
        user.id,
        refreshToken.familyId,
      );
      expect(repository.revokeTokenFamily).not.toHaveBeenCalled();
    });

    it('invalidates the whole family when an already rotated token is replayed', async () => {
      repository.findToken.mockResolvedValue({
        ...refreshToken,
        revokedAt: anHourAgo(),
      });

      await expect(
        service.refreshJwtToken({ refreshToken: 'raw-token' }, user.id),
      ).rejects.toThrow(UnauthorizedException);

      expect(repository.revokeTokenFamily).toHaveBeenCalledWith(
        refreshToken.familyId,
      );
      expect(helper.createAndSaveRefreshToken).not.toHaveBeenCalled();
    });

    it('rejects a token it has never issued', async () => {
      repository.findToken.mockResolvedValue(null);

      await expect(
        service.refreshJwtToken({ refreshToken: 'raw-token' }, user.id),
      ).rejects.toThrow(NotFoundException);

      expect(repository.revokeTokenFamily).not.toHaveBeenCalled();
      expect(helper.createAndSaveRefreshToken).not.toHaveBeenCalled();
    });

    it('rejects an expired token without rotating it', async () => {
      repository.findToken.mockResolvedValue({
        ...refreshToken,
        expiresAt: anHourAgo(),
      });

      await expect(
        service.refreshJwtToken({ refreshToken: 'raw-token' }, user.id),
      ).rejects.toThrow(BadRequestException);

      expect(repository.revokeToken).not.toHaveBeenCalled();
      expect(helper.createAndSaveRefreshToken).not.toHaveBeenCalled();
    });
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
