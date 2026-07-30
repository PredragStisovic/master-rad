import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { RefreshToken } from '../../../generated/prisma/client';
import { RoleName } from '../../common/constants/roles';
import { RolesRepository } from '../roles/roles.repository';
import { UserEntity } from '../users/entities/user.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { RefreshTokenRepository } from './refresh-token.repository';

@Injectable()
export class AuthHelper {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly rolesRepository: RolesRepository,
  ) {}

  async buildAccessTokenPayload(user: UserEntity): Promise<JwtPayload> {
    const role = await this.rolesRepository.findById(user.roleId);

    if (!role) {
      throw new UnauthorizedException('User has no valid role');
    }

    return {
      sub: user.id,
      email: user.email,
      roleId: role.id,
      role: role.name as RoleName,
    };
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async createAndSaveRefreshToken(userId: number): Promise<string> {
    const token = randomBytes(32).toString('base64');
    const hash = this.hashToken(token);
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);
    await this.refreshTokenRepository.saveTokenHash({
      tokenHash: hash,
      userId,
      expiresAt,
    });
    return token;
  }

  async getActiveRefreshToken(
    token: string,
    userId: number,
  ): Promise<RefreshToken> {
    const existingToken = await this.refreshTokenRepository.findToken(
      this.hashToken(token),
      userId,
    );

    if (!existingToken || existingToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token is not valid');
    }

    return existingToken;
  }
}
