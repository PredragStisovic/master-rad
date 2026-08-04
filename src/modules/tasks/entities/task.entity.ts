import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority, TaskStatus } from '../../../../generated/prisma/client';

export class TaskEntity {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Write the migration' })
  title: string;

  @ApiPropertyOptional({ example: 'A short description' })
  description: string | null;

  @ApiProperty({ enum: TaskStatus, example: TaskStatus.TODO })
  status: TaskStatus;

  @ApiProperty({ enum: TaskPriority, example: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @ApiProperty({ example: 1 })
  projectId: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
