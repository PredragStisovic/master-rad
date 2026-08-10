import { Module } from '@nestjs/common';
import { ProjectMembersModule } from '../project-members/project-members.module';
import { RolesModule } from '../roles/roles.module';
import { TasksController } from './tasks.controller';
import { TasksHelper } from './tasks.helper';
import { TasksRepository } from './tasks.repository';
import { TasksService } from './tasks.service';
import { TasksScopeHelper } from './tasks-scope.helper';

@Module({
  imports: [RolesModule, ProjectMembersModule],
  controllers: [TasksController],
  providers: [TasksService, TasksHelper, TasksRepository, TasksScopeHelper],
  exports: [TasksRepository, TasksScopeHelper],
})
export class TasksModule {}
