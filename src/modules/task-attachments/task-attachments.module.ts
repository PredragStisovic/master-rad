import { Module } from '@nestjs/common';
import { S3Module } from '../s3/s3.module';
import { TaskAttachmentsController } from './task-attachments.controller';
import { TaskAttachmentsService } from './task-attachments.service';
import { TaskAttachmentsRepository } from './task.attachments.repository';

@Module({
  imports: [S3Module],
  controllers: [TaskAttachmentsController],
  providers: [TaskAttachmentsService, TaskAttachmentsRepository],
})
export class TaskAttachmentsModule {}
