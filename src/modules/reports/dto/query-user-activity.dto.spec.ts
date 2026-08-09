import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryUserActivityDto } from './query-user-activity.dto';

const parse = (payload: Record<string, unknown>): QueryUserActivityDto =>
  plainToInstance(QueryUserActivityDto, payload);

const failingProperties = async (
  payload: Record<string, unknown>,
): Promise<string[]> => {
  const errors = await validate(parse(payload));

  return errors.map((error) => error.property);
};

describe('QueryUserActivityDto', () => {
  it('leaves the window unbounded when both ends are omitted', async () => {
    expect(parse({}).from).toBeUndefined();
    await expect(failingProperties({})).resolves.toEqual([]);
  });

  it('widens an ISO timestamp to a Date', async () => {
    expect(parse({ from: '2026-01-01T00:00:00.000Z' }).from).toEqual(
      new Date('2026-01-01T00:00:00.000Z'),
    );
    await expect(
      failingProperties({ from: '2026-01-01T00:00:00.000Z' }),
    ).resolves.toEqual([]);
  });

  it('accepts a date without a time', async () => {
    await expect(failingProperties({ to: '2026-01-01' })).resolves.toEqual([]);
  });

  it('rejects a term that is not a date rather than reading it as epoch', async () => {
    await expect(failingProperties({ from: 'yesterday' })).resolves.toEqual([
      'from',
    ]);
  });

  it('rejects a malformed date on either end', async () => {
    await expect(failingProperties({ to: '2026-13-45' })).resolves.toEqual([
      'to',
    ]);
  });
});
