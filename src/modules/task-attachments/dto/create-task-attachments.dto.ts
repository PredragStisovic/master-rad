import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateTaskAttachmentDto {
  @ApiProperty({ description: 'Task to which the attachment is related to' })
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  taskId: number;
}
