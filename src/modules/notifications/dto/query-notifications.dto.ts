import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { NotificationType } from '../../../../generated/prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

/**
 * Query strings carry `read` as text, so it is widened to a boolean here.
 * Anything other than `true`/`false` is passed through untouched and left
 * for `@IsBoolean()` to reject, rather than silently reading as unread.
 */
const toBoolean = ({ value }: { value: unknown }): unknown => {
  if (value === 'true' || value === true) {
    return true;
  }

  if (value === 'false' || value === false) {
    return false;
  }

  return value;
};

export class QueryNotificationsDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by read state; omit for both',
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  read?: boolean;

  @ApiPropertyOptional({
    enum: NotificationType,
    description: 'Filter by type',
  })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;
}
