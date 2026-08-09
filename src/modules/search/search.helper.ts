import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { QuerySearchDto } from './dto/query-search.dto';

/**
 * `contains` renders as `ILIKE '%' || term || '%'`, so a `%` or `_` typed into
 * the search box would otherwise act as a wildcard — `%` alone would match the
 * whole table. Postgres treats a backslash as the default LIKE escape, so the
 * three characters are escaped into literals before the term is interpolated.
 */
const escapeLikeWildcards = (term: string): string =>
  term.replace(/[\\%_]/g, (character) => `\\${character}`);

@Injectable()
export class SearchHelper {
  /**
   * Search is unscoped by route — there is no `:projectId` for
   * `ProjectAccessGuard` to check — so the reach of every query is fixed here
   * instead: only projects the caller owns or belongs to.
   */
  buildAccessibleProjectsWhere(userId: number): Prisma.ProjectWhereInput {
    return {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    };
  }

  buildProjectWhere(
    userId: number,
    query: QuerySearchDto,
  ): Prisma.ProjectWhereInput {
    const contains = {
      contains: escapeLikeWildcards(query.q),
      mode: 'insensitive',
    } as const;

    return {
      AND: [
        this.buildAccessibleProjectsWhere(userId),
        { OR: [{ name: contains }, { description: contains }] },
      ],
    };
  }

  buildTaskWhere(userId: number, query: QuerySearchDto): Prisma.TaskWhereInput {
    const contains = {
      contains: escapeLikeWildcards(query.q),
      mode: 'insensitive',
    } as const;

    return {
      project: this.buildAccessibleProjectsWhere(userId),
      OR: [{ title: contains }, { description: contains }],
    };
  }

  toPage<T>(
    data: T[],
    total: number,
    query: QuerySearchDto,
  ): PaginatedResult<T> {
    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
}
