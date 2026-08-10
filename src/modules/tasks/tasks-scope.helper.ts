import { Injectable, NotFoundException } from '@nestjs/common';
import { TaskEntity } from './entities/task.entity';
import { TasksRepository } from './tasks.repository';

/**
 * The one place that resolves a task inside its project. Shared by every module
 * that hangs off a task (comments, and the task routes themselves) so the
 * not-found semantics stay identical across them.
 */
@Injectable()
export class TasksScopeHelper {
  constructor(private readonly tasksRepository: TasksRepository) {}

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
