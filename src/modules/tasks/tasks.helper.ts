import { Injectable, NotFoundException } from '@nestjs/common';
import { ProjectsRepository } from '../projects/projects.repository';
import { TaskEntity } from './entities/task.entity';
import { TasksRepository } from './tasks.repository';

@Injectable()
export class TasksHelper {
  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly projectsRepository: ProjectsRepository,
  ) {}

  async assertProjectExists(projectId: number): Promise<void> {
    if (!(await this.projectsRepository.findById(projectId))) {
      throw new NotFoundException(`Project with id ${projectId} not found`);
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
