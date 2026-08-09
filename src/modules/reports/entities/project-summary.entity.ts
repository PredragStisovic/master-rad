import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus } from '../../../../generated/prisma/client';

export class AssigneeTaskCountEntity {
  @ApiProperty({
    example: 1,
    nullable: true,
    description: 'null is the unassigned bucket',
  })
  assigneeId: number | null;

  @ApiProperty({ example: 4 })
  count: number;
}

export class ProjectSummaryEntity {
  @ApiProperty({ example: 1 })
  projectId: number;

  @ApiProperty({ example: 7 })
  totalTasks: number;

  @ApiProperty({
    description: 'Every status, including the ones with no tasks',
    example: { TODO: 3, IN_PROGRESS: 2, IN_REVIEW: 0, DONE: 2 },
    additionalProperties: { type: 'integer' },
  })
  byStatus: Record<TaskStatus, number>;

  @ApiProperty({
    type: [AssigneeTaskCountEntity],
    description: 'Busiest assignee first; the unassigned bucket comes last',
  })
  byAssignee: AssigneeTaskCountEntity[];
}
