import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TaskCommentEntity } from './entities/task-comment.entity';
import { TaskCommentsRepository } from './task-comments.repository';

@Injectable()
export class TaskCommentsHelper {
  constructor(private readonly commentsRepository: TaskCommentsRepository) {}

  async getExistingComment(
    taskId: number,
    id: number,
  ): Promise<TaskCommentEntity> {
    const comment = await this.commentsRepository.findById(id);

    if (!comment || comment.taskId !== taskId) {
      throw new NotFoundException(
        `Comment with id ${id} not found on task ${taskId}`,
      );
    }

    return comment;
  }

  /**
   * Project access already got the caller this far; editing someone else's
   * words is a further step, so only the author may change or remove one.
   */
  assertIsAuthor(comment: TaskCommentEntity, userId: number): void {
    if (comment.authorId !== userId) {
      throw new ForbiddenException(
        `Comment ${comment.id} can only be modified by its author`,
      );
    }
  }
}
