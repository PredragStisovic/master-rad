import { Module } from '@nestjs/common';
import { RolesModule } from '../roles/roles.module';
import { TasksController } from './tasks.controller';
import { TasksHelper } from './tasks.helper';
import { TasksRepository } from './tasks.repository';
import { TasksService } from './tasks.service';

@Module({
  imports: [RolesModule],
  controllers: [TasksController],
  providers: [TasksService, TasksHelper, TasksRepository],
  exports: [TasksRepository],
})
export class TasksModule {}
