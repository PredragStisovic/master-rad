import { Injectable } from '@nestjs/common';
import { ProjectSummaryEntity } from './entities/project-summary.entity';
import { ReportsHelper } from './reports.helper';
import { ReportsRepository } from './reports.repository';

@Injectable()
export class ReportsService {
  constructor(
    private readonly reportsRepository: ReportsRepository,
    private readonly reportsHelper: ReportsHelper,
  ) {}

  async projectSummary(projectId: number): Promise<ProjectSummaryEntity> {
    const [statusRows, assigneeRows] = await Promise.all([
      this.reportsRepository.countTasksByStatus(projectId),
      this.reportsRepository.countTasksByAssignee(projectId),
    ]);

    return {
      projectId,
      // Both groupings cover the same rows, so either one totals the project.
      totalTasks: this.reportsHelper.sumCounts(statusRows),
      byStatus: this.reportsHelper.toStatusCounts(statusRows),
      byAssignee: this.reportsHelper.toAssigneeCounts(assigneeRows),
    };
  }
}
