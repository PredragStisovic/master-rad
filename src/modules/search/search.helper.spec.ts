import { Test, TestingModule } from '@nestjs/testing';
import { QuerySearchDto } from './dto/query-search.dto';
import { SearchHelper } from './search.helper';

const query = (overrides: Partial<QuerySearchDto> = {}): QuerySearchDto =>
  Object.assign(new QuerySearchDto(), { q: 'migration' }, overrides);

describe('SearchHelper', () => {
  let helper: SearchHelper;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SearchHelper],
    }).compile();

    helper = module.get(SearchHelper);
  });

  describe('toPage', () => {
    it('reports the totals for the requested window', () => {
      expect(helper.toPage(['a'], 25, query({ page: 2, limit: 10 }))).toEqual({
        data: ['a'],
        meta: { total: 25, page: 2, limit: 10, totalPages: 3 },
      });
    });

    it('reports no pages for a collection with no matches', () => {
      expect(helper.toPage([], 0, query()).meta.totalPages).toBe(0);
    });

    it('rounds a partial trailing page up', () => {
      expect(
        helper.toPage(['a'], 21, query({ limit: 10 })).meta.totalPages,
      ).toBe(3);
    });
  });
});
