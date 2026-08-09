import { Test, TestingModule } from '@nestjs/testing';
import { QuerySearchDto } from './dto/query-search.dto';
import { SearchHelper } from './search.helper';

const query = (overrides: Partial<QuerySearchDto> = {}): QuerySearchDto =>
  Object.assign(new QuerySearchDto(), { q: 'migration' }, overrides);

const accessibleTo = (userId: number) => ({
  OR: [{ ownerId: userId }, { members: { some: { userId } } }],
});

describe('SearchHelper', () => {
  let helper: SearchHelper;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SearchHelper],
    }).compile();

    helper = module.get(SearchHelper);
  });

  describe('buildAccessibleProjectsWhere', () => {
    it('reaches only the projects the caller owns or belongs to', () => {
      expect(helper.buildAccessibleProjectsWhere(7)).toEqual(accessibleTo(7));
    });
  });

  describe('buildProjectWhere', () => {
    it('matches name or description case-insensitively inside the caller’s reach', () => {
      expect(helper.buildProjectWhere(7, query())).toEqual({
        AND: [
          accessibleTo(7),
          {
            OR: [
              { name: { contains: 'migration', mode: 'insensitive' } },
              { description: { contains: 'migration', mode: 'insensitive' } },
            ],
          },
        ],
      });
    });

    it('escapes LIKE wildcards so `%` cannot match every row', () => {
      const where = helper.buildProjectWhere(7, query({ q: '100%_off' }));

      expect(where.AND).toContainEqual({
        OR: [
          { name: { contains: '100\\%\\_off', mode: 'insensitive' } },
          { description: { contains: '100\\%\\_off', mode: 'insensitive' } },
        ],
      });
    });

    it('escapes a backslash before it can escape something else', () => {
      const where = helper.buildProjectWhere(7, query({ q: 'a\\b' }));

      expect(where.AND).toContainEqual({
        OR: [
          { name: { contains: 'a\\\\b', mode: 'insensitive' } },
          { description: { contains: 'a\\\\b', mode: 'insensitive' } },
        ],
      });
    });
  });

  describe('buildTaskWhere', () => {
    it('matches title or description within the caller’s projects', () => {
      expect(helper.buildTaskWhere(7, query())).toEqual({
        project: accessibleTo(7),
        OR: [
          { title: { contains: 'migration', mode: 'insensitive' } },
          { description: { contains: 'migration', mode: 'insensitive' } },
        ],
      });
    });

    it('keeps the project scope regardless of the term', () => {
      expect(helper.buildTaskWhere(7, query({ q: '%' })).project).toEqual(
        accessibleTo(7),
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
  });
});
