import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TaskPriority, TaskStatus } from '../../../../generated/prisma/client';
import { CreateTaskDto } from './create-task.dto';
import { UpdateTaskDto } from './update-task.dto';

const failingProperties = async (
  cls: typeof CreateTaskDto | typeof UpdateTaskDto,
  payload: Record<string, unknown>,
): Promise<string[]> => {
  const errors = await validate(plainToInstance(cls, payload));

  return errors.map((error) => error.property);
};

describe('CreateTaskDto', () => {
  it('accepts a payload with only a title', async () => {
    await expect(
      failingProperties(CreateTaskDto, { title: 'Write the migration' }),
    ).resolves.toEqual([]);
  });

  it('accepts a fully specified payload', async () => {
    await expect(
      failingProperties(CreateTaskDto, {
        title: 'Write the migration',
        description: 'A short description',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
      }),
    ).resolves.toEqual([]);
  });

  it('rejects a missing title', async () => {
    await expect(failingProperties(CreateTaskDto, {})).resolves.toEqual([
      'title',
    ]);
  });

  it('rejects a blank title', async () => {
    await expect(
      failingProperties(CreateTaskDto, { title: '' }),
    ).resolves.toEqual(['title']);
  });

  it('rejects a title longer than 200 characters', async () => {
    await expect(
      failingProperties(CreateTaskDto, { title: 'a'.repeat(201) }),
    ).resolves.toEqual(['title']);
  });

  it('rejects a description longer than 2000 characters', async () => {
    await expect(
      failingProperties(CreateTaskDto, {
        title: 'Write the migration',
        description: 'a'.repeat(2001),
      }),
    ).resolves.toEqual(['description']);
  });

  it('rejects an unknown status', async () => {
    await expect(
      failingProperties(CreateTaskDto, {
        title: 'Write the migration',
        status: 'ARCHIVED',
      }),
    ).resolves.toEqual(['status']);
  });

  it('rejects an unknown priority', async () => {
    await expect(
      failingProperties(CreateTaskDto, {
        title: 'Write the migration',
        priority: 'CRITICAL',
      }),
    ).resolves.toEqual(['priority']);
  });
});

describe('UpdateTaskDto', () => {
  it('accepts an empty payload', async () => {
    await expect(failingProperties(UpdateTaskDto, {})).resolves.toEqual([]);
  });

  it('accepts a single field', async () => {
    await expect(
      failingProperties(UpdateTaskDto, { status: TaskStatus.DONE }),
    ).resolves.toEqual([]);
  });

  it('still validates the fields it does receive', async () => {
    await expect(
      failingProperties(UpdateTaskDto, { title: 'a'.repeat(201) }),
    ).resolves.toEqual(['title']);
  });
});
