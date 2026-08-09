import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Auth } from '../auth/decorators/auth.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { QuerySearchDto } from './dto/query-search.dto';
import { SearchResultsEntity } from './entities/search-results.entity';
import { SearchService } from './search.service';

@ApiTags('search')
@Auth()
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  // Reads both collections, so it asks for both read permissions even when
  // `type` narrows the response to one of them.
  @RequirePermissions('projects:read', 'tasks:read')
  @Get()
  @ApiOperation({
    summary: 'Search projects and tasks the caller has access to',
  })
  @ApiOkResponse({ type: SearchResultsEntity })
  @ApiBadRequestResponse({ description: 'Missing or too short search term' })
  search(
    @CurrentUser('userId') userId: number,
    @Query() query: QuerySearchDto,
  ): Promise<SearchResultsEntity> {
    return this.searchService.search(userId, query);
  }
}
