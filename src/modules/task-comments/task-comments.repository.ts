import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TaskCommentEntity } from './entities/task-comment.entity';

const commentSelect = {
  id: true,
  body: true,
  taskId: true,
  authorId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TaskCommentSelect;

@Injectable()
export class TaskCommentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: Prisma.TaskCommentUncheckedCreateInput,
  ): Promise<TaskCommentEntity> {
    return this.prisma.taskComment.create({ data, select: commentSelect });
  }

  findMany(taskId: number): Promise<TaskCommentEntity[]> {
    return this.prisma.taskComment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
      select: commentSelect,
    });
  }

  findById(id: number): Promise<TaskCommentEntity | null> {
    return this.prisma.taskComment.findUnique({
      where: { id },
      select: commentSelect,
    });
  }

  update(
    id: number,
    data: Prisma.TaskCommentUncheckedUpdateInput,
  ): Promise<TaskCommentEntity> {
    return this.prisma.taskComment.update({
      where: { id },
      data,
      select: commentSelect,
    });
  }

  delete(id: number): Promise<TaskCommentEntity> {
    return this.prisma.taskComment.delete({
      where: { id },
      select: commentSelect,
    });
  }
}
