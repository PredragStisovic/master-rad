import { Test, TestingModule } from '@nestjs/testing';
import { QuerySearchDto, SearchScope } from './dto/query-search.dto';
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

  describe('cacheKey', () => {
    it('separates one caller from another on the same query', () => {
      expect(helper.cacheKey(7, query())).not.toBe(helper.cacheKey(8, query()));
    });

    it('separates every input that changes the result', () => {
      const base = helper.cacheKey(7, query());

      for (const overrides of [
        { q: 'indexing' },
        { type: SearchScope.TASKS },
        { page: 2 },
        { limit: 10 },
      ]) {
        expect(helper.cacheKey(7, query(overrides))).not.toBe(base);
      }
    });

    it('folds case so the same term shares one entry', () => {
      expect(helper.cacheKey(7, query({ q: 'Migration' }))).toBe(
        helper.cacheKey(7, query({ q: 'migration' })),
      );
    });

    it('escapes a term so it cannot forge extra key segments', () => {
      expect(helper.cacheKey(7, query({ q: 'a:b' }))).toBe(
        'search:v1:u7:all:p1:l20:a%3Ab',
      );
    });
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
