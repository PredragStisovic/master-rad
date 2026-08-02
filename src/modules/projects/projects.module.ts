import { Global, Module } from '@nestjs/common';
import { RolesModule } from '../roles/roles.module';
import { ProjectsController } from './projects.controller';
import { ProjectsHelper } from './projects.helper';
import { ProjectsRepository } from './projects.repository';
import { ProjectsService } from './projects.service';

@Global()
@Module({
  imports: [RolesModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsHelper, ProjectsRepository],
  exports: [ProjectsService, ProjectsRepository],
})
export class ProjectsModule {}
