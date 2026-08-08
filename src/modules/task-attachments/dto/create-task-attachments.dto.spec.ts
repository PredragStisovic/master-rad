import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTaskAttachmentDto } from './create-task-attachments.dto';

const failingProperties = async (
  payload: Record<string, unknown>,
): Promise<string[]> => {
  const errors = await validate(
    plainToInstance(CreateTaskAttachmentDto, payload),
  );

  return errors.map((error) => error.property);
};

describe('CreateTaskAttachmentDto', () => {
  it('accepts a task id', async () => {
    await expect(failingProperties({ taskId: 5 })).resolves.toEqual([]);
  });

  it('accepts the numeric string a multipart form sends', async () => {
    await expect(failingProperties({ taskId: '5' })).resolves.toEqual([]);
  });

  it('coerces the multipart field to a number', () => {
    const dto = plainToInstance(CreateTaskAttachmentDto, { taskId: '5' });

    expect(dto.taskId).toBe(5);
  });

  it('rejects a missing task id', async () => {
    await expect(failingProperties({})).resolves.toEqual(['taskId']);
  });

  it('rejects a task id that is not a number', async () => {
    await expect(failingProperties({ taskId: 'five' })).resolves.toEqual([
      'taskId',
    ]);
  });
});
