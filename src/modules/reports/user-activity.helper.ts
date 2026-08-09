import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma } from '../../../generated/prisma/client';
import { UsersRepository } from '../users/users.repository';
import { QueryUserActivityDto } from './dto/query-user-activity.dto';
import { EntityTypeActivityEntity } from './entities/user-activity.entity';
import { ActionCount, EntityTypeCount } from './user-activity.repository';

/** Most-touched resource first, ties broken by name so the order is stable. */
const byVolume = (
  a: EntityTypeActivityEntity,
  b: EntityTypeActivityEntity,
): number => b.count - a.count || a.entityType.localeCompare(b.entityType);

@Injectable()
export class UserActivityHelper {
  constructor(private readonly usersRepository: UsersRepository) {}

  /**
   * An unknown user has no audit rows, so the report would happily come back
   * all zeroes and read as "this person did nothing" rather than "no such
   * person". The lookup keeps those two answers apart.
   */
  async assertUserExists(userId: number): Promise<void> {
    if (!(await this.usersRepository.findById(userId))) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }
  }

  assertWindowIsOrdered(query: QueryUserActivityDto): void {
    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException('`from` must not be later than `to`');
    }
  }

  buildWhere(
    userId: number,
    query: QueryUserActivityDto,
  ): Prisma.AuditLogWhereInput {
    const where: Prisma.AuditLogWhereInput = { userId };

    // Both bounds are inclusive, and an omitted one leaves that side open.
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from && { gte: query.from }),
        ...(query.to && { lte: query.to }),
      };
    }

    return where;
  }

  /**
   * `GROUP BY` only returns actions the user actually performed; a report that
   * drops the rest reads as missing data rather than as a zero.
   */
  toActionCounts(rows: ActionCount[]): Record<AuditAction, number> {
    const counts = Object.fromEntries(
      Object.values(AuditAction).map((action) => [action, 0]),
    ) as Record<AuditAction, number>;

    for (const row of rows) {
      counts[row.action] = row.count;
    }

    return counts;
  }

  toEntityTypeCounts(rows: EntityTypeCount[]): EntityTypeActivityEntity[] {
    return [...rows].sort(byVolume);
  }
}
