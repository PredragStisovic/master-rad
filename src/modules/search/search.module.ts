import { Module } from '@nestjs/common';
import { RolesModule } from '../roles/roles.module';
import { TasksModule } from '../tasks/tasks.module';
import { SearchController } from './search.controller';
import { SearchHelper } from './search.helper';
import { SearchService } from './search.service';

@Module({
  imports: [RolesModule, TasksModule],
  controllers: [SearchController],
  providers: [SearchService, SearchHelper],
})
export class SearchModule {}
