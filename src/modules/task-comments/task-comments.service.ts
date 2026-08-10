import { Injectable } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { TaskCommentEntity } from './entities/task-comment.entity';
import { TaskCommentsHelper } from './task-comments.helper';
import { TaskCommentsRepository } from './task-comments.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  TASK_COMMENTED_EVENT,
  TaskCommentedEvent,
} from '../../common/events/task-commented.event';
import { TasksScopeHelper } from '../tasks/tasks-scope.helper';

@Injectable()
export class TaskCommentsService {
  constructor(
    private readonly commentsRepository: TaskCommentsRepository,
    private readonly commentsHelper: TaskCommentsHelper,
    private readonly eventEmitter: EventEmitter2,
    private readonly tasksScopeHelper: TasksScopeHelper,
  ) {}

  async create(
    projectId: number,
    taskId: number,
    authorId: number,
    dto: CreateCommentDto,
  ): Promise<TaskCommentEntity> {
    await this.tasksScopeHelper.getExistingTask(projectId, taskId);

    const createdComment = await this.commentsRepository.create({
      ...dto,
      taskId,
      authorId,
    });

    this.eventEmitter.emit(TASK_COMMENTED_EVENT, {
      taskId: createdComment.taskId,
      actorId: createdComment.authorId,
    } satisfies TaskCommentedEvent);

    return createdComment;
  }

  async findAll(
    projectId: number,
    taskId: number,
  ): Promise<TaskCommentEntity[]> {
    await this.tasksScopeHelper.getExistingTask(projectId, taskId);

    return this.commentsRepository.findMany(taskId);
  }

  async findOne(
    projectId: number,
    taskId: number,
    id: number,
  ): Promise<TaskCommentEntity> {
    await this.tasksScopeHelper.getExistingTask(projectId, taskId);

    return this.commentsHelper.getExistingComment(taskId, id);
  }

  async update(
    projectId: number,
    taskId: number,
    id: number,
    userId: number,
    dto: UpdateCommentDto,
  ): Promise<TaskCommentEntity> {
    await this.tasksScopeHelper.getExistingTask(projectId, taskId);

    const comment = await this.commentsHelper.getExistingComment(taskId, id);
    this.commentsHelper.assertIsAuthor(comment, userId);

    return this.commentsRepository.update(id, dto);
  }

  async remove(
    projectId: number,
    taskId: number,
    id: number,
    userId: number,
  ): Promise<TaskCommentEntity> {
    await this.tasksScopeHelper.getExistingTask(projectId, taskId);

    const comment = await this.commentsHelper.getExistingComment(taskId, id);
    this.commentsHelper.assertIsAuthor(comment, userId);

    return this.commentsRepository.delete(id);
  }
}
