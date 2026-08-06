import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class AssignTaskDto {
  @ApiProperty({
    description: 'Id of the project member to assign',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assigneeId: number;
}
