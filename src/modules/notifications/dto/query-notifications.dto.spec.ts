import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { NotificationType } from '../../../../generated/prisma/client';
import { QueryNotificationsDto } from './query-notifications.dto';

const parse = (payload: Record<string, unknown>): QueryNotificationsDto =>
  plainToInstance(QueryNotificationsDto, payload);

const failingProperties = async (
  payload: Record<string, unknown>,
): Promise<string[]> => {
  const errors = await validate(parse(payload));

  return errors.map((error) => error.property);
};

describe('QueryNotificationsDto', () => {
  it('leaves the read filter unset when it is omitted', async () => {
    expect(parse({}).read).toBeUndefined();
    await expect(failingProperties({})).resolves.toEqual([]);
  });

  it('widens the query-string "true" to a boolean', async () => {
    expect(parse({ read: 'true' }).read).toBe(true);
    await expect(failingProperties({ read: 'true' })).resolves.toEqual([]);
  });

  it('widens the query-string "false" to a boolean', async () => {
    expect(parse({ read: 'false' }).read).toBe(false);
    await expect(failingProperties({ read: 'false' })).resolves.toEqual([]);
  });

  it('rejects anything else rather than reading it as unread', async () => {
    await expect(failingProperties({ read: 'yes' })).resolves.toEqual(['read']);
  });

  it('accepts a known notification type', async () => {
    await expect(
      failingProperties({ type: NotificationType.TASK_COMMENTED }),
    ).resolves.toEqual([]);
  });

  it('rejects an unknown notification type', async () => {
    await expect(failingProperties({ type: 'TASK_EXPLODED' })).resolves.toEqual(
      ['type'],
    );
  });

  it('still enforces the inherited pagination bounds', async () => {
    await expect(failingProperties({ limit: 500 })).resolves.toEqual(['limit']);
  });
});
