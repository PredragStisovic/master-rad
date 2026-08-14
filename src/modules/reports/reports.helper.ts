import { Injectable } from '@nestjs/common';
import { TaskStatus } from '../../../generated/prisma/client';
import { AssigneeTaskCountEntity } from './entities/project-summary.entity';
import { AssigneeCount, StatusCount } from './reports.repository';

/**
 * Shared by both reports so one bump retires every cached report payload at
 * once, whenever their shape changes.
 */
export const CACHE_KEY_VERSION = 'v1';

/**
 * Busiest assignee first, ties broken by id so the report is stable between
 * requests. The unassigned bucket is a backlog indicator rather than a person,
 * so it is pinned last however large it is.
 */
const byWorkload = (
  a: AssigneeTaskCountEntity,
  b: AssigneeTaskCountEntity,
): number => {
  if (a.assigneeId === null) {
    return b.assigneeId === null ? 0 : 1;
  }

  if (b.assigneeId === null) {
    return -1;
  }

  return b.count - a.count || a.assigneeId - b.assigneeId;
};

@Injectable()
export class ReportsHelper {
  /**
   * Keyed by project alone: the summary counts the project's tasks, and the
   * membership check that decides who may ask for it happens in the guard,
   * before this cache is ever consulted.
   */
  summaryCacheKey(projectId: number): string {
    return `reports:project-summary:${CACHE_KEY_VERSION}:p${projectId}`;
  }

  /**
   * `GROUP BY` only returns statuses that have rows, but a summary that drops
   * the empty ones reads as missing data rather than as a zero, so every
   * status is filled in.
   */
  toStatusCounts(rows: StatusCount[]): Record<TaskStatus, number> {
    const counts = Object.fromEntries(
      Object.values(TaskStatus).map((status) => [status, 0]),
    ) as Record<TaskStatus, number>;

    for (const row of rows) {
      counts[row.status] = row.count;
    }

    return counts;
  }

  toAssigneeCounts(rows: AssigneeCount[]): AssigneeTaskCountEntity[] {
    return [...rows].sort(byWorkload);
  }

  sumCounts(rows: { count: number }[]): number {
    return rows.reduce((total, row) => total + row.count, 0);
  }
}
