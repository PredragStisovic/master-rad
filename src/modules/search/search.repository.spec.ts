import { Test, TestingModule } from '@nestjs/testing';
import {
  Prisma,
  TaskPriority,
  TaskStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectEntity } from '../projects/entities/project.entity';
import { TaskEntity } from '../tasks/entities/task.entity';
import { SearchRepository } from './search.repository';

const project: ProjectEntity = {
  id: 1,
  name: 'Migration work',
  description: null,
  ownerId: 7,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const task: TaskEntity = {
  id: 5,
  title: 'Write the migration',
  description: null,
  status: TaskStatus.TODO,
  priority: TaskPriority.MEDIUM,
  projectId: 1,
  assigneeId: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

/**
 * Rebuilds the statement Prisma would have received, so assertions can read the
 * final SQL text and the flattened bind parameters rather than the raw
 * fragments the tagged template was called with.
 */
const compose = (call: unknown[]): Prisma.Sql => {
  const [strings, ...values] = call as [TemplateStringsArray, ...unknown[]];

  return Prisma.sql(strings, ...values);
};

describe('SearchRepository', () => {
  let repository: SearchRepository;
  let queryRaw: jest.Mock;

  const lastQuery = (): Prisma.Sql =>
    compose(queryRaw.mock.calls[0] as unknown[]);

  beforeEach(async () => {
    // `COUNT(*)` without a `GROUP BY` always yields exactly one row, so the
    // default stands in for the shape the counts read.
    queryRaw = jest.fn().mockResolvedValue([{ count: 0 }]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchRepository,
        { provide: PrismaService, useValue: { $queryRaw: queryRaw } },
      ],
    }).compile();

    repository = module.get(SearchRepository);
  });

  describe('findProjects', () => {
    it('returns the rows the driver produced', async () => {
      queryRaw.mockResolvedValue([project]);

      await expect(
        repository.findProjects(7, 'migration', 0, 20),
      ).resolves.toEqual([project]);
    });

    it('matches the tsvector column so the GIN index can serve the query', () => {
      void repository.findProjects(7, 'migration', 0, 20);

      expect(lastQuery().sql).toContain('p."search" @@ websearch_to_tsquery');
    });

    it('parses the term with websearch_to_tsquery, never to_tsquery', () => {
      void repository.findProjects(7, 'migration', 0, 20);

      // `to_tsquery` throws on stray operators typed into a search box.
      expect(lastQuery().sql).not.toMatch(/[^_]to_tsquery/);
    });

    it('binds the term instead of concatenating it into the SQL', () => {
      void repository.findProjects(7, "'; DROP TABLE projects; --", 0, 20);

      const query = lastQuery();

      expect(query.sql).not.toContain('DROP TABLE');
      expect(query.values).toContain("'; DROP TABLE projects; --");
    });

    it('restricts the result to projects the caller owns or belongs to', () => {
      void repository.findProjects(7, 'migration', 0, 20);

      const query = lastQuery();

      expect(query.sql).toContain('p."id" IN (');
      expect(query.sql).toContain('ap."owner_id" = ?');
      expect(query.sql).toContain('"project_members"');
    });

    it('orders by relevance, breaking ties on a stable key', () => {
      void repository.findProjects(7, 'migration', 0, 20);

      expect(lastQuery().sql).toContain(
        'ORDER BY ts_rank(p."search", websearch_to_tsquery(?, ?)) DESC, p."id" ASC',
      );
    });

    it('binds the search configuration, term, caller and window in order', () => {
      void repository.findProjects(7, 'migration', 40, 20);

      expect(lastQuery().values).toEqual([
        'english',
        'migration',
        7,
        7,
        'english',
        'migration',
        20,
        40,
      ]);
    });

    it('aliases the snake_case columns onto the entity shape', () => {
      void repository.findProjects(7, 'migration', 0, 20);

      const { sql } = lastQuery();

      expect(sql).toContain('p."owner_id"   AS "ownerId"');
      expect(sql).toContain('p."created_at" AS "createdAt"');
      expect(sql).toContain('p."updated_at" AS "updatedAt"');
    });
  });

  describe('countProjects', () => {
    it('unwraps the counted row', async () => {
      queryRaw.mockResolvedValue([{ count: 3 }]);

      await expect(repository.countProjects(7, 'migration')).resolves.toBe(3);
    });

    it('casts the bigint down so the total is a number, not a BigInt', () => {
      void repository.countProjects(7, 'migration');

      expect(lastQuery().sql).toContain('COUNT(*)::int AS "count"');
    });

    it('counts through the same term and access filter it pages with', () => {
      void repository.countProjects(7, 'migration');

      const query = lastQuery();

      expect(query.sql).toContain('p."search" @@ websearch_to_tsquery');
      expect(query.values).toEqual(['english', 'migration', 7, 7]);
    });

    it('does not page the count', () => {
      void repository.countProjects(7, 'migration');

      expect(lastQuery().sql).not.toContain('LIMIT');
    });
  });

  describe('findTasks', () => {
    it('returns the rows the driver produced', async () => {
      queryRaw.mockResolvedValue([task]);

      await expect(
        repository.findTasks(7, 'migration', 0, 20),
      ).resolves.toEqual([task]);
    });

    it('matches the tsvector column so the GIN index can serve the query', () => {
      void repository.findTasks(7, 'migration', 0, 20);

      expect(lastQuery().sql).toContain('t."search" @@ websearch_to_tsquery');
    });

    it('reaches only tasks living in a project the caller can see', () => {
      void repository.findTasks(7, 'migration', 0, 20);

      const query = lastQuery();

      expect(query.sql).toContain('t."project_id" IN (');
      expect(query.sql).toContain('"project_members"');
    });

    it('orders by relevance, breaking ties on a stable key', () => {
      void repository.findTasks(7, 'migration', 0, 20);

      expect(lastQuery().sql).toContain(
        'ORDER BY ts_rank(t."search", websearch_to_tsquery(?, ?)) DESC, t."id" ASC',
      );
    });

    it('binds the search configuration, term, caller and window in order', () => {
      void repository.findTasks(7, 'migration', 40, 20);

      expect(lastQuery().values).toEqual([
        'english',
        'migration',
        7,
        7,
        'english',
        'migration',
        20,
        40,
      ]);
    });

    it('aliases the snake_case columns onto the entity shape', () => {
      void repository.findTasks(7, 'migration', 0, 20);

      const { sql } = lastQuery();

      expect(sql).toContain('t."project_id"  AS "projectId"');
      expect(sql).toContain('t."assignee_id" AS "assigneeId"');
    });
  });

  describe('countTasks', () => {
    it('unwraps the counted row', async () => {
      queryRaw.mockResolvedValue([{ count: 2 }]);

      await expect(repository.countTasks(7, 'migration')).resolves.toBe(2);
    });

    it('counts through the same term and access filter it pages with', () => {
      void repository.countTasks(7, 'migration');

      const query = lastQuery();

      expect(query.sql).toContain('t."search" @@ websearch_to_tsquery');
      expect(query.values).toEqual(['english', 'migration', 7, 7]);
    });
  });
});
