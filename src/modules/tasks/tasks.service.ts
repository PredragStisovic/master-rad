import { Injectable } from '@nestjs/common';
import { AssignTaskDto } from './dto/assign-task.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskEntity } from './entities/task.entity';
import { TasksHelper } from './tasks.helper';
import { TasksRepository } from './tasks.repository';

@Injectable()
export class TasksService {
  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly tasksHelper: TasksHelper,
  ) {}

  async create(projectId: number, dto: CreateTaskDto): Promise<TaskEntity> {
    await this.tasksHelper.assertProjectExists(projectId);

    return this.tasksRepository.create({ ...dto, projectId });
  }

  async findAll(projectId: number): Promise<TaskEntity[]> {
    await this.tasksHelper.assertProjectExists(projectId);

    return this.tasksRepository.findMany(projectId);
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
    dto: AssignTaskDto,
  ): Promise<TaskEntity> {
    await this.tasksHelper.getExistingTask(projectId, id);
    await this.tasksHelper.assertUserIsProjectMember(projectId, dto.assigneeId);

    return this.tasksRepository.update(id, { assigneeId: dto.assigneeId });
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
