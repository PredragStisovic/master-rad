import { Injectable } from '@nestjs/common';
import { TaskStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** One `GROUP BY` bucket, already flattened out of Prisma's `_count` shape. */
export interface StatusCount {
  status: TaskStatus;
  count: number;
}

export interface AssigneeCount {
  /** `null` is the unassigned bucket, not a missing value. */
  assigneeId: number | null;
  count: number;
}

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async countTasksByStatus(projectId: number): Promise<StatusCount[]> {
    const rows = await this.prisma.task.groupBy({
      by: ['status'],
      where: { projectId },
      _count: { _all: true },
    });

    return rows.map((row) => ({ status: row.status, count: row._count._all }));
  }

  async countTasksByAssignee(projectId: number): Promise<AssigneeCount[]> {
    const rows = await this.prisma.task.groupBy({
      by: ['assigneeId'],
      where: { projectId },
      _count: { _all: true },
    });

    return rows.map((row) => ({
      assigneeId: row.assigneeId,
      count: row._count._all,
    }));
  }
}
