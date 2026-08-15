import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { TaskPriority, TaskStatus } from '../../../../generated/prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

/** Columns the task list may be ordered by — an allow-list, not free text. */
export enum TaskSortBy {
  ID = 'id',
  TITLE = 'title',
  STATUS = 'status',
  PRIORITY = 'priority',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * Value accepted in place of an assignee id to ask for the tasks nobody owns.
 * A blank `assigneeId=` cannot carry that meaning — a form that submits an
 * untouched field means "do not filter by assignee", which is the opposite —
 * so "no assignee" needs a spelling of its own.
 */
export const UNASSIGNED = 'none';

/**
 * A query string has no way to say "absent". A UI that submits its whole filter
 * form sends `?status=&priority=&assigneeId=` for the boxes the user left
 * alone, and an empty string fails every validator below. Rewriting a blank
 * before validation makes an unfilled box mean what it looks like.
 *
 * The fallback is explicit because class-transformer assigns whatever the
 * transform returns: handing back `undefined` for a property that declares an
 * initialiser overwrites that default instead of falling back to it.
 */
const blankTo =
  <T>(fallback: T) =>
  ({ value }: TransformFnParams): unknown =>
    value === '' ? fallback : value;

export class QueryTasksDto extends PaginationDto {
  @ApiPropertyOptional({ enum: TaskStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(TaskStatus)
  @Transform(blankTo(undefined))
  status?: TaskStatus;

  @ApiPropertyOptional({
    enum: TaskPriority,
    description: 'Filter by priority',
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  @Transform(blankTo(undefined))
  priority?: TaskPriority;

  /**
   * `null` here means "unassigned", not "no filter" — `@IsOptional` waves both
   * `null` and `undefined` past the id validators, and `buildWhere` tells them
   * apart so only `undefined` drops the filter.
   */
  @ApiPropertyOptional({
    description: `Filter by assignee id, or "${UNASSIGNED}" for tasks that have no assignee`,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }: TransformFnParams): unknown => {
    if (value === '' || value === undefined) {
      return undefined;
    }

    return value === UNASSIGNED ? null : Number(value);
  })
  assigneeId?: number | null;

  @ApiPropertyOptional({ enum: TaskSortBy, default: TaskSortBy.ID })
  @IsOptional()
  @IsEnum(TaskSortBy)
  @Transform(blankTo(TaskSortBy.ID))
  sortBy: TaskSortBy = TaskSortBy.ID;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.ASC })
  @IsOptional()
  @IsEnum(SortOrder)
  @Transform(blankTo(SortOrder.ASC))
  sortOrder: SortOrder = SortOrder.ASC;
}
