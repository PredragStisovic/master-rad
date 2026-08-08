import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectMembersRepository } from '../project-members/project-members.repository';
import { ProjectsRepository } from '../projects/projects.repository';
import { TasksRepository } from '../tasks/tasks.repository';
import { CreateTaskAttachmentDto } from './dto/create-task-attachments.dto';
import { CreateTaskAttachmentType } from './types/create-task-attachment.type';

@Injectable()
export class TaskAttachmentsHelper {
  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly projectsRepository: ProjectsRepository,
    private readonly membersRepository: ProjectMembersRepository,
  ) {}

  /**
   * The task id travels in the body rather than the path, so `ProjectAccessGuard`
   * cannot scope this route. The same owner-or-member rule is applied here.
   */
  async assertTaskIsAccessible(taskId: number, userId: number): Promise<void> {
    const task = await this.tasksRepository.findById(taskId);

    if (!task) {
      throw new NotFoundException(`Task with id ${taskId} not found`);
    }

    const project = await this.projectsRepository.findById(task.projectId);

    if (project?.ownerId === userId) {
      return;
    }

    const membership = await this.membersRepository.findByProjectAndUser(
      task.projectId,
      userId,
    );

    if (!membership) {
      throw new ForbiddenException(
        'This user has no access rights for project',
      );
    }
  }

  /** Maps one uploaded file, already stored under `storageKey`, onto a row. */
  toCreateInput(
    dto: CreateTaskAttachmentDto,
    file: Express.Multer.File,
    uploadedById: number,
    storageKey: string,
  ): CreateTaskAttachmentType {
    return {
      taskId: dto.taskId,
      uploadedById,
      storageKey,
      filename: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    };
  }
}
