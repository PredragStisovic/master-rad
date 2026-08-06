import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AssignTaskDto } from './assign-task.dto';

const failingProperties = async (
  payload: Record<string, unknown>,
): Promise<string[]> => {
  const errors = await validate(plainToInstance(AssignTaskDto, payload));

  return errors.map((error) => error.property);
};

describe('AssignTaskDto', () => {
  it('accepts a positive assignee id', async () => {
    await expect(failingProperties({ assigneeId: 7 })).resolves.toEqual([]);
  });

  it('coerces a numeric string coming from the request body', () => {
    const dto = plainToInstance(AssignTaskDto, { assigneeId: '7' });

    expect(dto.assigneeId).toBe(7);
  });

  it('rejects a missing assignee id', async () => {
    await expect(failingProperties({})).resolves.toEqual(['assigneeId']);
  });

  it('rejects a non-positive assignee id', async () => {
    await expect(failingProperties({ assigneeId: 0 })).resolves.toEqual([
      'assigneeId',
    ]);
  });

  it('rejects a non-numeric assignee id', async () => {
    await expect(failingProperties({ assigneeId: 'me' })).resolves.toEqual([
      'assigneeId',
    ]);
  });
});
