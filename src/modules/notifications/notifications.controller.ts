import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuditAction } from '../../../generated/prisma/client';
import { AuditActionType } from '../../common/decorators/audit-action.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@Auth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @RequirePermissions('notifications:create')
  @AuditActionType(AuditAction.CREATE)
  @Post()
  @ApiOperation({ summary: 'Notify a user' })
  @ApiCreatedResponse({ type: NotificationEntity })
  @ApiBadRequestResponse({ description: 'Unknown recipient or task' })
  create(@Body() dto: CreateNotificationDto): Promise<NotificationEntity> {
    return this.notificationsService.create(dto);
  }

  @RequirePermissions('notifications:read')
  @Get()
  @ApiOperation({ summary: 'List your notifications, newest first' })
  @ApiOkResponse({ type: [NotificationEntity] })
  findAll(
    @CurrentUser('userId') userId: number,
    @Query() query: QueryNotificationsDto,
  ): Promise<PaginatedResult<NotificationEntity>> {
    return this.notificationsService.findAll(userId, query);
  }

  @RequirePermissions('notifications:update')
  @AuditActionType(AuditAction.UPDATE)
  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one of your notifications as read' })
  @ApiOkResponse({ type: NotificationEntity })
  @ApiNotFoundResponse({ description: 'Notification not found' })
  markRead(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('userId') userId: number,
  ): Promise<NotificationEntity> {
    return this.notificationsService.markRead(userId, id);
  }
}
