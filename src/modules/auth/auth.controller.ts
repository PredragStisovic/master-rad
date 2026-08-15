import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SkipThrottle, ThrottlerGuard } from '@nestjs/throttler';
import { AUTH_THROTTLER } from '../../config/throttler.config';
import { AuditAction } from '../../../generated/prisma/client';
import { AuditActionType } from '../../common/decorators/audit-action.decorator';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { LogoutDto } from './dto/logout.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Auth } from './decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserEntity } from '../users/entities/user.entity';

/**
 * Rate-limited as a whole: every route here either accepts a credential or
 * mints one, so the cheapest defence is to cap how often a single client may
 * ask. `@SkipThrottle` marks the exceptions rather than each route opting in,
 * so a route added later is limited by default.
 */
@UseGuards(ThrottlerGuard)
@ApiTooManyRequestsResponse({ description: 'Auth rate limit exceeded' })
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @AuditActionType(AuditAction.CREATE)
  @Post('register')
  async registerUser(dto: RegisterUserDto) {
    return await this.authService.registerUser(dto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async loginUser(@Request() req) {
    return await this.authService.loginUser(req.user);
  }

  @Auth()
  @Post('refresh')
  async refreshJwtToken(@Body() body, @CurrentUser('userId') userId: number) {
    return await this.authService.refreshJwtToken(body, userId);
  }

  @Auth()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Log out by revoking a refresh token' })
  @ApiNoContentResponse({ description: 'Refresh token revoked' })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid access token, or unusable refresh token',
  })
  logout(
    @CurrentUser('userId') userId: number,
    @Body() dto: LogoutDto,
  ): Promise<void> {
    return this.authService.logout(userId, dto);
  }

  // A read a signed-in client may poll; it carries no credential to guess, so
  // limiting it would only get in the way of legitimate traffic.
  @SkipThrottle({ [AUTH_THROTTLER]: true })
  @Auth()
  @Get('me')
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  @ApiOkResponse({ type: UserEntity })
  getCurrentUser(@CurrentUser('userId') userId: number): Promise<UserEntity> {
    return this.authService.getCurrentUser(userId);
  }
}
