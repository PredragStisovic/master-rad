import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TaskPriority, TaskStatus } from '../../../../generated/prisma/client';
import { QueryTasksDto, SortOrder, TaskSortBy } from './query-tasks.dto';

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
});
