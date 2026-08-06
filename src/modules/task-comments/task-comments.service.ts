import { Injectable } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { TaskCommentEntity } from './entities/task-comment.entity';
import { TaskCommentsHelper } from './task-comments.helper';
import { TaskCommentsRepository } from './task-comments.repository';

@Injectable()
export class TaskCommentsService {
  constructor(
    private readonly commentsRepository: TaskCommentsRepository,
    private readonly commentsHelper: TaskCommentsHelper,
  ) {}

  async create(
    projectId: number,
    taskId: number,
    authorId: number,
    dto: CreateCommentDto,
  ): Promise<TaskCommentEntity> {
    await this.commentsHelper.assertTaskExists(projectId, taskId);

    return this.commentsRepository.create({ ...dto, taskId, authorId });
  }

  async findAll(
    projectId: number,
    taskId: number,
  ): Promise<TaskCommentEntity[]> {
    await this.commentsHelper.assertTaskExists(projectId, taskId);

    return this.commentsRepository.findMany(taskId);
  }

  async findOne(
    projectId: number,
    taskId: number,
    id: number,
  ): Promise<TaskCommentEntity> {
    await this.commentsHelper.assertTaskExists(projectId, taskId);

    return this.commentsHelper.getExistingComment(taskId, id);
  }

  async update(
    projectId: number,
    taskId: number,
    id: number,
    userId: number,
    dto: UpdateCommentDto,
  ): Promise<TaskCommentEntity> {
    await this.commentsHelper.assertTaskExists(projectId, taskId);

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
    await this.commentsHelper.assertTaskExists(projectId, taskId);

    const comment = await this.commentsHelper.getExistingComment(taskId, id);
    this.commentsHelper.assertIsAuthor(comment, userId);

    return this.commentsRepository.delete(id);
  }
}
