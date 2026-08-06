import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
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

export class QueryTasksDto extends PaginationDto {
  @ApiPropertyOptional({ enum: TaskStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({
    enum: TaskPriority,
    description: 'Filter by priority',
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ description: 'Filter by assignee id' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assigneeId?: number;

  @ApiPropertyOptional({ enum: TaskSortBy, default: TaskSortBy.ID })
  @IsOptional()
  @IsEnum(TaskSortBy)
  sortBy: TaskSortBy = TaskSortBy.ID;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.ASC })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.ASC;
}
