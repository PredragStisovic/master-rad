import { Module } from '@nestjs/common';
import { RolesModule } from '../roles/roles.module';
import { SearchController } from './search.controller';
import { SearchHelper } from './search.helper';
import { SearchRepository } from './search.repository';
import { SearchService } from './search.service';

@Module({
  imports: [RolesModule],
  controllers: [SearchController],
  providers: [SearchService, SearchHelper, SearchRepository],
})
export class SearchModule {}
