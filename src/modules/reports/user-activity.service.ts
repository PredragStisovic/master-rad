import { Injectable } from '@nestjs/common';
import { QueryUserActivityDto } from './dto/query-user-activity.dto';
import { UserActivityEntity } from './entities/user-activity.entity';
import { ReportsHelper } from './reports.helper';
import { UserActivityHelper } from './user-activity.helper';
import { UserActivityRepository } from './user-activity.repository';

@Injectable()
export class UserActivityService {
  constructor(
    private readonly userActivityRepository: UserActivityRepository,
    private readonly userActivityHelper: UserActivityHelper,
    // Totalling buckets is the same job the project summary does.
    private readonly reportsHelper: ReportsHelper,
  ) {}

  async userActivity(
    userId: number,
    query: QueryUserActivityDto,
  ): Promise<UserActivityEntity> {
    this.userActivityHelper.assertWindowIsOrdered(query);
    await this.userActivityHelper.assertUserExists(userId);

    const where = this.userActivityHelper.buildWhere(userId, query);

    const [actionRows, entityTypeRows] = await Promise.all([
      this.userActivityRepository.countByAction(where),
      this.userActivityRepository.countByEntityType(where),
    ]);

    return {
      userId,
      from: query.from ?? null,
      to: query.to ?? null,
      // Both groupings cover the same rows, so either one totals the window.
      totalActions: this.reportsHelper.sumCounts(actionRows),
      byAction: this.userActivityHelper.toActionCounts(actionRows),
      byEntityType: this.userActivityHelper.toEntityTypeCounts(entityTypeRows),
    };
  }
}
