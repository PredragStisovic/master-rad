import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { QuerySearchDto } from './dto/query-search.dto';

/**
 * Bumped whenever the cached payload changes shape, so a deploy stops reading
 * the entries written by the version before it instead of serving them.
 */
const CACHE_KEY_VERSION = 'v1';

@Injectable()
export class SearchHelper {
  /**
   * The caller id leads the key because results are already filtered to the
   * projects that caller can reach — a key built from the query alone would
   * hand one user another user's matches on the next request.
   */
  cacheKey(userId: number, query: QuerySearchDto): string {
    // `websearch_to_tsquery` lowercases the term anyway, so folding case here
    // lets "Migration" and "migration" share one entry.
    const term = encodeURIComponent(query.q.toLowerCase());

    return [
      'search',
      CACHE_KEY_VERSION,
      `u${userId}`,
      query.type,
      `p${query.page}`,
      `l${query.limit}`,
      term,
    ].join(':');
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
