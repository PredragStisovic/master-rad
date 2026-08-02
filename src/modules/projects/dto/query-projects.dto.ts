import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryProjectsDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Case-insensitive match on name/description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by owner id' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  ownerId?: number;
}
