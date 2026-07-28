import { Injectable } from '@nestjs/common';
import { Prisma, RefreshToken } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async saveTokenHash(
    refreshTokenDto: Prisma.RefreshTokenUncheckedCreateInput,
  ) {
    try {
      await this.prisma.refreshToken.create({
        data: refreshTokenDto,
      });
    } catch (error) {
      throw new Error();
    }
  }

  async findToken(
    hashedToken: string,
    userId: number,
  ): Promise<RefreshToken | null> {
    return await this.prisma.refreshToken.findFirst({
      where: { tokenHash: hashedToken, userId },
    });
  }

  async deleteToken(id: number): Promise<void> {
    await this.prisma.refreshToken.delete({ where: { id } });
  }
}
