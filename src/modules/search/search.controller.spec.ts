import { QuerySearchDto } from './dto/query-search.dto';
import { SearchResultsEntity } from './entities/search-results.entity';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

const results = {
  projects: { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } },
  tasks: { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } },
} as SearchResultsEntity;

const createServiceMock = () => ({
  search: jest.fn().mockResolvedValue(results),
});

describe('SearchController', () => {
  let controller: SearchController;
  let service: ReturnType<typeof createServiceMock>;

  // Instantiated directly: the route guards declared on the controller are
  // policy, exercised in the e2e specs, not part of this unit.
  beforeEach(() => {
    service = createServiceMock();
    controller = new SearchController(service as unknown as SearchService);
  });

  describe('search', () => {
    it('passes the caller so the service can scope the query', async () => {
      const query = Object.assign(new QuerySearchDto(), { q: 'migration' });

      await expect(controller.search(7, query)).resolves.toEqual(results);
      expect(service.search).toHaveBeenCalledWith(7, query);
    });
  });
});
