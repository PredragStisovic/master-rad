import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateTaskAttachmentDto {
  @ApiProperty({ description: 'Task to which the attachment is related to' })
  @IsNumber()
  @IsNotEmpty()
  taskId: number;
}
