import { ApiProperty } from '@nestjs/swagger';
import { PaginatedResult } from '../../../common/dto/pagination.dto';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { TaskEntity } from '../../tasks/entities/task.entity';

class SearchPageMetaEntity {
  @ApiProperty({ example: 3, description: 'Matches in this collection' })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}

class ProjectSearchPageEntity implements PaginatedResult<ProjectEntity> {
  @ApiProperty({ type: [ProjectEntity] })
  data: ProjectEntity[];

  @ApiProperty({ type: SearchPageMetaEntity })
  meta: SearchPageMetaEntity;
}

class TaskSearchPageEntity implements PaginatedResult<TaskEntity> {
  @ApiProperty({ type: [TaskEntity] })
  data: TaskEntity[];

  @ApiProperty({ type: SearchPageMetaEntity })
  meta: SearchPageMetaEntity;
}

/**
 * Both collections are always present so the response shape does not depend on
 * the `type` filter; a collection the caller excluded comes back empty with a
 * total of 0, and is never queried.
 */
export class SearchResultsEntity {
  @ApiProperty({ type: ProjectSearchPageEntity })
  projects: ProjectSearchPageEntity;

  @ApiProperty({ type: TaskSearchPageEntity })
  tasks: TaskSearchPageEntity;
}
