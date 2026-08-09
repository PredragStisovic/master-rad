import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';

export class QueryUserActivityDto {
  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Start of the window, inclusive; omit for all history',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({
    format: 'date-time',
    description: 'End of the window, inclusive; omit for up to now',
    example: '2026-02-01T00:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
