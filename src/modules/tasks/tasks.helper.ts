import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { ProjectMembersRepository } from '../project-members/project-members.repository';
import { ProjectsRepository } from '../projects/projects.repository';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { TaskEntity } from './entities/task.entity';
import { TasksRepository } from './tasks.repository';

@Injectable()
export class TasksHelper {
  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly projectsRepository: ProjectsRepository,
    private readonly membersRepository: ProjectMembersRepository,
  ) {}

  async assertProjectExists(projectId: number): Promise<void> {
    if (!(await this.projectsRepository.findById(projectId))) {
      throw new NotFoundException(`Project with id ${projectId} not found`);
    }
  }

  buildWhere(projectId: number, query: QueryTasksDto): Prisma.TaskWhereInput {
    const where: Prisma.TaskWhereInput = { projectId };

    if (query.status !== undefined) {
      where.status = query.status;
    }

    if (query.priority !== undefined) {
      where.priority = query.priority;
    }

    if (query.assigneeId !== undefined) {
      where.assigneeId = query.assigneeId;
    }

    return where;
  }

  async assertUserIsProjectMember(
    projectId: number,
    userId: number,
  ): Promise<void> {
    const member = await this.membersRepository.findByProjectAndUser(
      projectId,
      userId,
    );

    if (!member) {
      throw new BadRequestException(
        `User ${userId} is not a member of project ${projectId}`,
      );
    }
  }

  async getExistingTask(projectId: number, id: number): Promise<TaskEntity> {
    const task = await this.tasksRepository.findById(id);

    if (!task || task.projectId !== projectId) {
      throw new NotFoundException(
        `Task with id ${id} not found in project ${projectId}`,
      );
    }

    return task;
  }
}
