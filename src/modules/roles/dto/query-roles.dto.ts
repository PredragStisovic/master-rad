import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryRolesDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Case-insensitive match on the name' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  search?: string;
}
