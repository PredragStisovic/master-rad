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
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
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
  async refreshJwtToken(@Body() body, @Request() req) {
    return await this.authService.refreshJwtToken(body, req.user);
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

  @Auth()
  @Get('me')
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  @ApiOkResponse({ type: UserEntity })
  getCurrentUser(@CurrentUser('userId') userId: number): Promise<UserEntity> {
    return this.authService.getCurrentUser(userId);
  }
}
