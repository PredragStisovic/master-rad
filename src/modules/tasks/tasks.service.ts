import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskEntity } from './entities/task.entity';
import { TasksHelper } from './tasks.helper';
import { TasksRepository } from './tasks.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  TASK_ASSIGNED_EVENT,
  TaskAssignedEvent,
} from '../../common/events/task-assigned.event';

@Injectable()
export class TasksService {
  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly tasksHelper: TasksHelper,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(projectId: number, dto: CreateTaskDto): Promise<TaskEntity> {
    await this.tasksHelper.assertProjectExists(projectId);

    return this.tasksRepository.create({ ...dto, projectId });
  }

  async findAll(
    projectId: number,
    query: QueryTasksDto,
  ): Promise<PaginatedResult<TaskEntity>> {
    await this.tasksHelper.assertProjectExists(projectId);

    const where = this.tasksHelper.buildWhere(projectId, query);
    const orderBy = this.tasksHelper.buildOrderBy(query);

    const [data, total] = await Promise.all([
      this.tasksRepository.findMany(where, orderBy, query.skip, query.limit),
      this.tasksRepository.count(where),
    ]);

    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  findOne(projectId: number, id: number): Promise<TaskEntity> {
    return this.tasksHelper.getExistingTask(projectId, id);
  }

  async update(
    projectId: number,
    id: number,
    dto: UpdateTaskDto,
  ): Promise<TaskEntity> {
    await this.tasksHelper.getExistingTask(projectId, id);

    return this.tasksRepository.update(id, dto);
  }

  async assign(
    projectId: number,
    id: number,
    actorId: number,
    dto: AssignTaskDto,
  ): Promise<TaskEntity> {
    await this.tasksHelper.getExistingTask(projectId, id);
    await this.tasksHelper.assertUserIsProjectMember(projectId, dto.assigneeId);

    const assignedTask = await this.tasksRepository.update(id, {
      assigneeId: dto.assigneeId,
    });

    this.eventEmitter.emit(TASK_ASSIGNED_EVENT, {
      taskId: assignedTask.id,
      assigneeId: dto.assigneeId,
      actorId,
    } satisfies TaskAssignedEvent);

    return assignedTask;
  }

  async unassign(projectId: number, id: number): Promise<TaskEntity> {
    await this.tasksHelper.getExistingTask(projectId, id);

    return this.tasksRepository.update(id, { assigneeId: null });
  }

  async remove(projectId: number, id: number): Promise<TaskEntity> {
    await this.tasksHelper.getExistingTask(projectId, id);

    return this.tasksRepository.delete(id);
  }
}
