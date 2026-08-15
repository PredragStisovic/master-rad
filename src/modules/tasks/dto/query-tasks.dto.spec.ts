import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TaskPriority, TaskStatus } from '../../../../generated/prisma/client';
import {
  QueryTasksDto,
  SortOrder,
  TaskSortBy,
  UNASSIGNED,
} from './query-tasks.dto';

const failingProperties = async (
  payload: Record<string, unknown>,
): Promise<string[]> => {
  const errors = await validate(plainToInstance(QueryTasksDto, payload));

  return errors.map((error) => error.property);
};

describe('QueryTasksDto', () => {
  it('accepts an empty query and falls back to the first page', () => {
    const dto = plainToInstance(QueryTasksDto, {});

    expect({ page: dto.page, limit: dto.limit, skip: dto.skip }).toEqual({
      page: 1,
      limit: 20,
      skip: 0,
    });
  });

  it('accepts every filter at once', async () => {
    await expect(
      failingProperties({
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        assigneeId: 7,
        page: 2,
        limit: 50,
      }),
    ).resolves.toEqual([]);
  });

  it('coerces the numeric query-string values', () => {
    const dto = plainToInstance(QueryTasksDto, {
      assigneeId: '7',
      page: '3',
      limit: '10',
    });

    expect({ assigneeId: dto.assigneeId, skip: dto.skip }).toEqual({
      assigneeId: 7,
      skip: 20,
    });
  });

  it('rejects an unknown status', async () => {
    await expect(failingProperties({ status: 'ARCHIVED' })).resolves.toEqual([
      'status',
    ]);
  });

  it('rejects an unknown priority', async () => {
    await expect(failingProperties({ priority: 'CRITICAL' })).resolves.toEqual([
      'priority',
    ]);
  });

  it('rejects a non-positive assignee id', async () => {
    await expect(failingProperties({ assigneeId: 0 })).resolves.toEqual([
      'assigneeId',
    ]);
  });

  it('rejects a limit above the pagination maximum', async () => {
    await expect(failingProperties({ limit: 101 })).resolves.toEqual(['limit']);
  });

  it('defaults to ascending id when no sort is requested', () => {
    const dto = plainToInstance(QueryTasksDto, {});

    expect({ sortBy: dto.sortBy, sortOrder: dto.sortOrder }).toEqual({
      sortBy: TaskSortBy.ID,
      sortOrder: SortOrder.ASC,
    });
  });

  it('accepts an allowed sort column and direction', async () => {
    await expect(
      failingProperties({
        sortBy: TaskSortBy.PRIORITY,
        sortOrder: SortOrder.DESC,
      }),
    ).resolves.toEqual([]);
  });

  it('rejects a column outside the allow-list', async () => {
    await expect(failingProperties({ sortBy: 'assigneeId' })).resolves.toEqual([
      'sortBy',
    ]);
  });

  it('rejects an unknown sort direction', async () => {
    await expect(failingProperties({ sortOrder: 'sideways' })).resolves.toEqual(
      ['sortOrder'],
    );
  });

  describe('blank query-string values', () => {
    const blankQuery = {
      status: '',
      priority: '',
      assigneeId: '',
      sortBy: '',
      sortOrder: '',
    };

    it('accepts a filter form submitted with every box left empty', async () => {
      await expect(failingProperties(blankQuery)).resolves.toEqual([]);
    });

    it('reads a blank filter as absent rather than as a value', () => {
      const dto = plainToInstance(QueryTasksDto, blankQuery);

      expect({
        status: dto.status,
        priority: dto.priority,
        assigneeId: dto.assigneeId,
      }).toEqual({
        status: undefined,
        priority: undefined,
        assigneeId: undefined,
      });
    });

    it('keeps the sort defaults instead of blanking them out', () => {
      const dto = plainToInstance(QueryTasksDto, blankQuery);

      expect({ sortBy: dto.sortBy, sortOrder: dto.sortOrder }).toEqual({
        sortBy: TaskSortBy.ID,
        sortOrder: SortOrder.ASC,
      });
    });
  });

  describe('the unassigned sentinel', () => {
    it(`turns "${UNASSIGNED}" into a null assignee filter`, () => {
      const dto = plainToInstance(QueryTasksDto, { assigneeId: UNASSIGNED });

      expect(dto.assigneeId).toBeNull();
    });

    it('accepts the sentinel as a valid assignee filter', async () => {
      await expect(
        failingProperties({ assigneeId: UNASSIGNED }),
      ).resolves.toEqual([]);
    });

    it('combines with the other filters', async () => {
      const payload = {
        status: TaskStatus.DONE,
        priority: '',
        assigneeId: UNASSIGNED,
      };

      await expect(failingProperties(payload)).resolves.toEqual([]);

      const dto = plainToInstance(QueryTasksDto, payload);

      expect({
        status: dto.status,
        priority: dto.priority,
        assigneeId: dto.assigneeId,
      }).toEqual({
        status: TaskStatus.DONE,
        priority: undefined,
        assigneeId: null,
      });
    });

    it('still rejects any other non-numeric assignee', async () => {
      await expect(
        failingProperties({ assigneeId: 'nobody' }),
      ).resolves.toEqual(['assigneeId']);
    });
  });
});
