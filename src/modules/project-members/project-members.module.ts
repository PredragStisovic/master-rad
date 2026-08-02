import { Module } from '@nestjs/common';
import { RolesModule } from '../roles/roles.module';
import { ProjectMembersController } from './project-members.controller';
import { ProjectMembersHelper } from './project-members.helper';
import { ProjectMembersRepository } from './project-members.repository';
import { ProjectMembersService } from './project-members.service';

@Module({
  imports: [RolesModule],
  controllers: [ProjectMembersController],
  providers: [
    ProjectMembersService,
    ProjectMembersHelper,
    ProjectMembersRepository,
  ],
  exports: [ProjectMembersRepository],
})
export class ProjectMembersModule {}
