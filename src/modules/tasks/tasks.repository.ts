import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TaskEntity } from './entities/task.entity';

const taskSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  projectId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TaskSelect;

@Injectable()
export class TasksRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.TaskUncheckedCreateInput): Promise<TaskEntity> {
    return this.prisma.task.create({ data, select: taskSelect });
  }

  findMany(projectId: number): Promise<TaskEntity[]> {
    return this.prisma.task.findMany({
      where: { projectId },
      orderBy: { id: 'asc' },
      select: taskSelect,
    });
  }

  findById(id: number): Promise<TaskEntity | null> {
    return this.prisma.task.findUnique({ where: { id }, select: taskSelect });
  }

  update(
    id: number,
    data: Prisma.TaskUncheckedUpdateInput,
  ): Promise<TaskEntity> {
    return this.prisma.task.update({ where: { id }, data, select: taskSelect });
  }

  delete(id: number): Promise<TaskEntity> {
    return this.prisma.task.delete({ where: { id }, select: taskSelect });
  }
}
