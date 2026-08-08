import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../../../../generated/prisma/client';

export class NotificationEntity {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ enum: NotificationType })
  type: NotificationType;

  @ApiProperty({ example: 'You were assigned to "Wire up the interceptor"' })
  message: string;

  @ApiProperty({ example: 1, description: 'Recipient of the notification' })
  userId: number;

  @ApiProperty({ example: 1, nullable: true })
  taskId: number | null;

  @ApiProperty({
    nullable: true,
    description: 'When the recipient read it; null while unread',
  })
  readAt: Date | null;

  @ApiProperty()
  createdAt: Date;
}
