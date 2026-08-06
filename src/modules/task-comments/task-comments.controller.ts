import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Auth } from '../auth/decorators/auth.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { ProjectRelation } from '../auth/decorators/project-relation.decorator';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { TaskCommentEntity } from './entities/task-comment.entity';
import { TaskCommentsService } from './task-comments.service';

@ApiTags('task-comments')
@Auth()
@ProjectRelation('member')
@Controller('projects/:projectId/tasks/:taskId/comments')
export class TaskCommentsController {
  constructor(private readonly commentsService: TaskCommentsService) {}

  @RequirePermissions('comments:create')
  @Post()
  @ApiOperation({ summary: 'Comment on a task' })
  @ApiCreatedResponse({ type: TaskCommentEntity })
  @ApiNotFoundResponse({ description: 'Task not found' })
  create(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('taskId', ParseIntPipe) taskId: number,
    @CurrentUser('userId') userId: number,
    @Body() dto: CreateCommentDto,
  ): Promise<TaskCommentEntity> {
    return this.commentsService.create(projectId, taskId, userId, dto);
  }

  @RequirePermissions('comments:read')
  @Get()
  @ApiOperation({ summary: 'List the comments of a task, oldest first' })
  @ApiOkResponse({ type: [TaskCommentEntity] })
  @ApiNotFoundResponse({ description: 'Task not found' })
  findAll(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('taskId', ParseIntPipe) taskId: number,
  ): Promise<TaskCommentEntity[]> {
    return this.commentsService.findAll(projectId, taskId);
  }

  @RequirePermissions('comments:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get a comment by id' })
  @ApiOkResponse({ type: TaskCommentEntity })
  @ApiNotFoundResponse({ description: 'Task or comment not found' })
  findOne(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TaskCommentEntity> {
    return this.commentsService.findOne(projectId, taskId, id);
  }

  @RequirePermissions('comments:update')
  @Patch(':id')
  @ApiOperation({ summary: 'Edit your own comment' })
  @ApiOkResponse({ type: TaskCommentEntity })
  @ApiForbiddenResponse({ description: 'Caller is not the comment author' })
  @ApiNotFoundResponse({ description: 'Task or comment not found' })
  update(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('userId') userId: number,
    @Body() dto: UpdateCommentDto,
  ): Promise<TaskCommentEntity> {
    return this.commentsService.update(projectId, taskId, id, userId, dto);
  }

  @RequirePermissions('comments:delete')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete your own comment' })
  @ApiOkResponse({ type: TaskCommentEntity })
  @ApiForbiddenResponse({ description: 'Caller is not the comment author' })
  @ApiNotFoundResponse({ description: 'Task or comment not found' })
  remove(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('userId') userId: number,
  ): Promise<TaskCommentEntity> {
    return this.commentsService.remove(projectId, taskId, id, userId);
  }
}
