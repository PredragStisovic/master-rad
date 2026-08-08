import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TaskAttachmentsEntity } from './entities/task-attachments.entity';

@Injectable()
export class TaskAttachmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  taskAttachmentSelect = { storageKey: true, filename: true };

  create(
    data: Prisma.TaskAttachmentUncheckedCreateInput,
  ): Promise<TaskAttachmentsEntity> {
    return this.prisma.taskAttachment.create({
      data,
      select: this.taskAttachmentSelect,
    });
  }

  findMany(
    where: Prisma.TaskAttachmentWhereInput,
    skip: number,
    take: number,
  ): Promise<TaskAttachmentsEntity[]> {
    return this.prisma.taskAttachment.findMany({
      where,
      skip,
      take,
      orderBy: { id: 'asc' },
      select: this.taskAttachmentSelect,
    });
  }

  count(where: Prisma.TaskAttachmentWhereInput): Promise<number> {
    return this.prisma.taskAttachment.count({ where });
  }

  findById(id: number): Promise<TaskAttachmentsEntity | null> {
    return this.prisma.taskAttachment.findUnique({
      where: { id },
      select: this.taskAttachmentSelect,
    });
  }

  findByName(filename: string): Promise<TaskAttachmentsEntity | null> {
    return this.prisma.taskAttachment.findFirst({
      where: { filename: filename },
      select: this.taskAttachmentSelect,
    });
  }

  async findIdByName(filename: string): Promise<number | null> {
    const taskAttachment = await this.prisma.taskAttachment.findFirst({
      where: { filename },
      select: { id: true },
    });

    return taskAttachment?.id ?? null;
  }

  delete(id: number): Promise<TaskAttachmentsEntity> {
    return this.prisma.taskAttachment.delete({
      where: { id },
      select: this.taskAttachmentSelect,
    });
  }
}
