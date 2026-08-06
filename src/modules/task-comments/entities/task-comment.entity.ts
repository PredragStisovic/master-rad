import { ApiProperty } from '@nestjs/swagger';

export class TaskCommentEntity {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Looks good, one nit on the migration name.' })
  body: string;

  @ApiProperty({ example: 1 })
  taskId: number;

  @ApiProperty({ example: 1 })
  authorId: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
