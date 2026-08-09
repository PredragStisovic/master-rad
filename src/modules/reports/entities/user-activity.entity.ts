import { ApiProperty } from '@nestjs/swagger';
import { AuditAction } from '../../../../generated/prisma/client';

export class EntityTypeActivityEntity {
  @ApiProperty({
    example: 'Tasks',
    description: 'The audited resource, as recorded by the audit interceptor',
  })
  entityType: string;

  @ApiProperty({ example: 12 })
  count: number;
}

export class UserActivityEntity {
  @ApiProperty({ example: 1 })
  userId: number;

  @ApiProperty({
    nullable: true,
    description: 'The requested window, echoed back; null means unbounded',
  })
  from: Date | null;

  @ApiProperty({ nullable: true })
  to: Date | null;

  @ApiProperty({ example: 17 })
  totalActions: number;

  @ApiProperty({
    description: 'Every action, including the ones the user never performed',
    example: { CREATE: 9, UPDATE: 7, DELETE: 1 },
    additionalProperties: { type: 'integer' },
  })
  byAction: Record<AuditAction, number>;

  @ApiProperty({
    type: [EntityTypeActivityEntity],
    description: 'Most-touched resource first',
  })
  byEntityType: EntityTypeActivityEntity[];
}
