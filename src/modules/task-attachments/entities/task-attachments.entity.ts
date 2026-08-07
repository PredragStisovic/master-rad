import { ApiProperty } from '@nestjs/swagger';

export class TaskAttachmentsEntity {
  @ApiProperty()
  storageKey: string;

  filename: string;
}
