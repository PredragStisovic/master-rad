import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { QuerySearchDto } from './dto/query-search.dto';

@Injectable()
export class SearchHelper {
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
