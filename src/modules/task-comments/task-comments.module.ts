import { Module } from '@nestjs/common';
import { RolesModule } from '../roles/roles.module';
import { TasksModule } from '../tasks/tasks.module';
import { TaskCommentsController } from './task-comments.controller';
import { TaskCommentsHelper } from './task-comments.helper';
import { TaskCommentsRepository } from './task-comments.repository';
import { TaskCommentsService } from './task-comments.service';

@Module({
  imports: [RolesModule, TasksModule],
  controllers: [TaskCommentsController],
  providers: [TaskCommentsService, TaskCommentsHelper, TaskCommentsRepository],
  exports: [TaskCommentsRepository],
})
export class TaskCommentsModule {}
