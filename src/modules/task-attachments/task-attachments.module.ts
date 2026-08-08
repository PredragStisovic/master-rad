import { Module } from '@nestjs/common';
import { ProjectMembersModule } from '../project-members/project-members.module';
import { RolesModule } from '../roles/roles.module';
import { S3Module } from '../s3/s3.module';
import { TasksModule } from '../tasks/tasks.module';
import { TaskAttachmentsController } from './task-attachments.controller';
import { TaskAttachmentsService } from './task-attachments.service';
import { TaskAttachmentsHelper } from './task.attachments.helper';
import { TaskAttachmentsRepository } from './task.attachments.repository';

@Module({
  imports: [S3Module, RolesModule, TasksModule, ProjectMembersModule],
  controllers: [TaskAttachmentsController],
  providers: [
    TaskAttachmentsService,
    TaskAttachmentsHelper,
    TaskAttachmentsRepository,
  ],
  exports: [TaskAttachmentsRepository],
})
export class TaskAttachmentsModule {}
