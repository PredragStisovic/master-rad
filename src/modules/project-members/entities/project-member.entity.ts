import { ApiProperty } from '@nestjs/swagger';
import { ProjectRole } from '../../../../generated/prisma/client';

export class ProjectMemberEntity {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  projectId: number;

  @ApiProperty({ example: 1 })
  userId: number;

  @ApiProperty({ enum: ProjectRole, example: ProjectRole.MEMBER })
  role: ProjectRole;

  @ApiProperty()
  joinedAt: Date;
}
