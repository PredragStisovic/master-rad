import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProjectEntity {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'My Project' })
  name: string;

  @ApiPropertyOptional({ example: 'A short description' })
  description: string | null;

  @ApiProperty({ example: 1 })
  ownerId: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
