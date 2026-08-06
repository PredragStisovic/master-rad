import {
  Body,
  Controller,
  Delete,
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
import { Auth } from '../auth/decorators/auth.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { ProjectRelation } from '../auth/decorators/project-relation.decorator';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskEntity } from './entities/task.entity';
import { TasksService } from './tasks.service';

@ApiTags('tasks')
@Auth()
@ProjectRelation('member')
@Controller('projects/:projectId/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @RequirePermissions('tasks:create')
  @Post()
  @ApiOperation({ summary: 'Create a task in a project' })
  @ApiCreatedResponse({ type: TaskEntity })
  @ApiNotFoundResponse({ description: 'Project not found' })
  create(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() dto: CreateTaskDto,
  ): Promise<TaskEntity> {
    return this.tasksService.create(projectId, dto);
  }

  @RequirePermissions('tasks:read')
  @Get()
  @ApiOperation({ summary: 'List tasks of a project (paginated, filterable)' })
  @ApiOkResponse({ type: [TaskEntity] })
  @ApiNotFoundResponse({ description: 'Project not found' })
  findAll(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query() query: QueryTasksDto,
  ): Promise<PaginatedResult<TaskEntity>> {
    return this.tasksService.findAll(projectId, query);
  }

  @RequirePermissions('tasks:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get a task by id' })
  @ApiOkResponse({ type: TaskEntity })
  @ApiNotFoundResponse({ description: 'Task not found' })
  findOne(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TaskEntity> {
    return this.tasksService.findOne(projectId, id);
  }

  @RequirePermissions('tasks:update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a task' })
  @ApiOkResponse({ type: TaskEntity })
  @ApiNotFoundResponse({ description: 'Task not found' })
  update(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskDto,
  ): Promise<TaskEntity> {
    return this.tasksService.update(projectId, id, dto);
  }

  @RequirePermissions('tasks:update')
  @Patch(':id/assignee')
  @ApiOperation({ summary: 'Assign a task to a project member' })
  @ApiOkResponse({ type: TaskEntity })
  @ApiBadRequestResponse({ description: 'Assignee is not a project member' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  assign(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignTaskDto,
  ): Promise<TaskEntity> {
    return this.tasksService.assign(projectId, id, dto);
  }

  @RequirePermissions('tasks:update')
  @Delete(':id/assignee')
  @ApiOperation({ summary: 'Clear the assignee of a task' })
  @ApiOkResponse({ type: TaskEntity })
  @ApiNotFoundResponse({ description: 'Task not found' })
  unassign(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TaskEntity> {
    return this.tasksService.unassign(projectId, id);
  }

  @RequirePermissions('tasks:delete')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task' })
  @ApiOkResponse({ type: TaskEntity })
  @ApiNotFoundResponse({ description: 'Task not found' })
  remove(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TaskEntity> {
    return this.tasksService.remove(projectId, id);
  }
}
