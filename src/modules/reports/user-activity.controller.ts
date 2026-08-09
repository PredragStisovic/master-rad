import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Auth } from '../auth/decorators/auth.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { QueryUserActivityDto } from './dto/query-user-activity.dto';
import { UserActivityEntity } from './entities/user-activity.entity';
import { UserActivityService } from './user-activity.service';

@ApiTags('reports')
@Auth()
@Controller('reports/users')
export class UserActivityController {
  constructor(private readonly userActivityService: UserActivityService) {}

  // Not project-scoped: the audit log spans every project, so this route is
  // gated by the admin-only `reports:read` rather than by project membership.
  @RequirePermissions('reports:read')
  @Get(':userId/activity')
  @ApiOperation({ summary: 'Audited actions of one user, over a time window' })
  @ApiOkResponse({ type: UserActivityEntity })
  @ApiBadRequestResponse({ description: 'Malformed or inverted time window' })
  @ApiNotFoundResponse({ description: 'User not found' })
  userActivity(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() query: QueryUserActivityDto,
  ): Promise<UserActivityEntity> {
    return this.userActivityService.userActivity(userId, query);
  }
}
