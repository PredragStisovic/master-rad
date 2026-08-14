import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';
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
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async userActivity(
    userId: number,
    query: QueryUserActivityDto,
  ): Promise<UserActivityEntity> {
    // Both guards stay in front of the cache: a cached 200 must never be what
    // answers a malformed window or an unknown user.
    this.userActivityHelper.assertWindowIsOrdered(query);
    await this.userActivityHelper.assertUserExists(userId);

    return this.cache.wrap(
      this.userActivityHelper.cacheKey(userId, query),
      async () => {
        const where = this.userActivityHelper.buildWhere(userId, query);

        const [actionRows, entityTypeRows] = await Promise.all([
          this.userActivityRepository.countByAction(where),
          this.userActivityRepository.countByEntityType(where),
        ]);

        return {
          userId,
          from: query.from ?? null,
          to: query.to ?? null,
          // Both groupings cover the same rows, so either totals the window.
          totalActions: this.reportsHelper.sumCounts(actionRows),
          byAction: this.userActivityHelper.toActionCounts(actionRows),
          byEntityType:
            this.userActivityHelper.toEntityTypeCounts(entityTypeRows),
        };
      },
    );
  }
}
