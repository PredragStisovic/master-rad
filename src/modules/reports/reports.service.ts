import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { ProjectSummaryEntity } from './entities/project-summary.entity';
import { ReportsHelper } from './reports.helper';
import { ReportsRepository } from './reports.repository';

@Injectable()
export class ReportsService {
  constructor(
    private readonly reportsRepository: ReportsRepository,
    private readonly reportsHelper: ReportsHelper,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  /**
   * Two aggregates over every task in the project, for a dashboard that is
   * polled far more often than the counts move — so the summary is cached and
   * left to expire rather than being invalidated on each task write.
   */
  projectSummary(projectId: number): Promise<ProjectSummaryEntity> {
    return this.cache.wrap(
      this.reportsHelper.summaryCacheKey(projectId),
      async () => {
        const [statusRows, assigneeRows] = await Promise.all([
          this.reportsRepository.countTasksByStatus(projectId),
          this.reportsRepository.countTasksByAssignee(projectId),
        ]);

        return {
          projectId,
          // Both groupings cover the same rows, so either totals the project.
          totalTasks: this.reportsHelper.sumCounts(statusRows),
          byStatus: this.reportsHelper.toStatusCounts(statusRows),
          byAssignee: this.reportsHelper.toAssigneeCounts(assigneeRows),
        };
      },
    );
  }
}
