import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

/** Collections the search may be narrowed to — an allow-list, not free text. */
export enum SearchScope {
  ALL = 'all',
  PROJECTS = 'projects',
  TASKS = 'tasks',
}

export class QuerySearchDto extends PaginationDto {
  @ApiProperty({
    description:
      'Full-text term matched against names, titles and descriptions. ' +
      'Words are stemmed and combined with AND; "quoted words" match as a ' +
      'phrase and -word excludes.',
    example: 'migration',
    minLength: 2,
    maxLength: 100,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  // A one-character term matches most of the table, so the floor is two.
  @Length(2, 100)
  q: string;

  @ApiPropertyOptional({ enum: SearchScope, default: SearchScope.ALL })
  @IsOptional()
  @IsEnum(SearchScope)
  type: SearchScope = SearchScope.ALL;
}
