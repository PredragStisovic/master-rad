import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '../../../common/constants/roles';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { TaskStatus } from '../../../../generated/prisma/client';
import { TasksRepository } from '../tasks.repository';

const allowedTransitions: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.TODO]: [
    TaskStatus.IN_PROGRESS,
    TaskStatus.IN_REVIEW,
    TaskStatus.DONE,
  ],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.IN_REVIEW, TaskStatus.DONE],
  [TaskStatus.IN_REVIEW]: [TaskStatus.TODO, TaskStatus.IN_PROGRESS],
  [TaskStatus.DONE]: [TaskStatus.DONE],
};
@Injectable()
export class TaskTransitionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly taskRepository: TasksRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const body: UpdateTaskDto = request.body;
    const existingTask = await this.taskRepository.findById(request.params.id);

    if (!body.status || !existingTask?.status) {
      return true;
    }

    if (allowedTransitions[existingTask.status].includes(body.status)) {
      return true;
    }

    return false;
  }
}
