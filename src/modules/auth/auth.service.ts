import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterUserDto } from './dto/register-user.dto';
import { UsersService } from '../users/users.service';
import { LoginUserDto } from './dto/login-user.dto';
import { LogoutDto } from './dto/logout.dto';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../users/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { AuthHelper } from './auth.helper';
import { RefreshTokenRepository } from './refresh-token.repository';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
    private readonly authHelper: AuthHelper,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async registerUser(dto: RegisterUserDto) {
    await this.userService.create(dto);
  }

  async loginUser(user: UserEntity) {
    try {
      const payload = await this.authHelper.buildAccessTokenPayload(user);
      const refreshToken = await this.authHelper.createAndSaveRefreshToken(
        user.id,
        randomUUID(),
      );
      return {
        access_token: this.jwtService.sign(payload),
        refresh_token: refreshToken,
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async refreshJwtToken(body: any, userId: number) {
    const hashedToken = this.authHelper.hashToken(body.refreshToken);
    const existingToken = await this.refreshTokenRepository.findToken(
      hashedToken,
      userId,
    );

    if (!existingToken) {
      throw new NotFoundException();
    }
    if (existingToken.expiresAt < new Date()) {
      throw new BadRequestException();
    }
    if (existingToken.revokedAt) {
      await this.refreshTokenRepository.revokeTokenFamily(
        existingToken.familyId,
      );
      throw new UnauthorizedException('Refresh token is not valid');
    }

    await this.refreshTokenRepository.revokeToken(existingToken.id);
    const newRefreshToken = await this.authHelper.createAndSaveRefreshToken(
      userId,
      existingToken.familyId,
    );

    const user = await this.userService.findOne(userId);
    const payload = await this.authHelper.buildAccessTokenPayload(user);
    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: newRefreshToken,
    };
  }

  async logout(userId: number, dto: LogoutDto): Promise<void> {
    const refreshToken = await this.authHelper.getActiveRefreshToken(
      dto.refreshToken,
      userId,
    );

    await this.refreshTokenRepository.revokeToken(refreshToken.id);
  }

  getCurrentUser(userId: number): Promise<UserEntity> {
    return this.userService.findOne(userId);
  }

  async validateUser(dto: LoginUserDto) {
    const user = await this.userService.findOneWithPasswordByEmail(dto.email);

    if (await bcrypt.compare(dto.password, user.password)) {
      const { password, ...result } = user;
      return result;
    }

    return null;
  }
}
