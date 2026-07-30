import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { RefreshToken } from '../../../generated/prisma/client';
import { RefreshTokenRepository } from './refresh-token.repository';

@Injectable()
export class AuthHelper {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async createAndSaveRefreshToken(userId: number): Promise<string> {
    const token = randomBytes(32).toString('base64');
    const hash = this.hashToken(token);
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);
    await this.refreshTokenRepository.saveTokenHash({ tokenHash: hash, userId, expiresAt });
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
