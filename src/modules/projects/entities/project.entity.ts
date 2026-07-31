import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectMemberEntity } from 'src/modules/project-members/entities/project-member.entity';

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

  @ApiProperty()
  members?: ProjectMemberEntity[];
}
