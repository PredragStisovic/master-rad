import { Test, TestingModule } from '@nestjs/testing';
import { TaskStatus } from '../../../generated/prisma/client';
import { ReportsHelper } from './reports.helper';

describe('ReportsHelper', () => {
  let helper: ReportsHelper;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportsHelper],
    }).compile();

    helper = module.get(ReportsHelper);
  });

  describe('toStatusCounts', () => {
    it('fills in the statuses the grouping left out', () => {
      expect(
        helper.toStatusCounts([
          { status: TaskStatus.TODO, count: 3 },
          { status: TaskStatus.DONE, count: 2 },
        ]),
      ).toEqual({ TODO: 3, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 2 });
    });

    it('reports an empty project as all zeroes, not as an empty object', () => {
      expect(helper.toStatusCounts([])).toEqual({
        TODO: 0,
        IN_PROGRESS: 0,
        IN_REVIEW: 0,
        DONE: 0,
      });
    });

    it('covers every status the schema defines', () => {
      expect(Object.keys(helper.toStatusCounts([]))).toEqual(
        Object.values(TaskStatus),
      );
    });
  });

  describe('toAssigneeCounts', () => {
    it('puts the busiest assignee first', () => {
      expect(
        helper.toAssigneeCounts([
          { assigneeId: 1, count: 2 },
          { assigneeId: 2, count: 5 },
        ]),
      ).toEqual([
        { assigneeId: 2, count: 5 },
        { assigneeId: 1, count: 2 },
      ]);
    });

    it('breaks ties by id so the order is stable between requests', () => {
      expect(
        helper.toAssigneeCounts([
          { assigneeId: 9, count: 2 },
          { assigneeId: 3, count: 2 },
        ]),
      ).toEqual([
        { assigneeId: 3, count: 2 },
        { assigneeId: 9, count: 2 },
      ]);
    });

    it('pins the unassigned bucket last however large it is', () => {
      expect(
        helper.toAssigneeCounts([
          { assigneeId: null, count: 50 },
          { assigneeId: 1, count: 1 },
        ]),
      ).toEqual([
        { assigneeId: 1, count: 1 },
        { assigneeId: null, count: 50 },
      ]);
    });

    it('leaves the rows it was given untouched', () => {
      const rows = [
        { assigneeId: 1, count: 1 },
        { assigneeId: 2, count: 9 },
      ];

      helper.toAssigneeCounts(rows);

      expect(rows[0].assigneeId).toBe(1);
    });
  });

  describe('sumCounts', () => {
    it('totals the buckets', () => {
      expect(helper.sumCounts([{ count: 3 }, { count: 4 }])).toBe(7);
    });

    it('totals an empty project as zero', () => {
      expect(helper.sumCounts([])).toBe(0);
    });
  });
});
