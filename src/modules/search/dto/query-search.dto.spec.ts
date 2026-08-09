import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QuerySearchDto, SearchScope } from './query-search.dto';

const parse = (payload: Record<string, unknown>): QuerySearchDto =>
  plainToInstance(QuerySearchDto, payload);

const failingProperties = async (
  payload: Record<string, unknown>,
): Promise<string[]> => {
  const errors = await validate(parse(payload));

  return errors.map((error) => error.property);
};

describe('QuerySearchDto', () => {
  it('accepts a term and defaults to searching both collections', async () => {
    expect(parse({ q: 'migration' }).type).toBe(SearchScope.ALL);
    await expect(failingProperties({ q: 'migration' })).resolves.toEqual([]);
  });

  it('requires a term', async () => {
    await expect(failingProperties({})).resolves.toEqual(['q']);
  });

  it('rejects a one-character term that would match most rows', async () => {
    await expect(failingProperties({ q: 'a' })).resolves.toEqual(['q']);
  });

  it('rejects a term longer than the column-sized ceiling', async () => {
    await expect(failingProperties({ q: 'a'.repeat(101) })).resolves.toEqual([
      'q',
    ]);
  });

  it('trims the term before measuring it', async () => {
    expect(parse({ q: '  migration  ' }).q).toBe('migration');
    await expect(failingProperties({ q: ' a ' })).resolves.toEqual(['q']);
  });

  it('accepts a known scope', async () => {
    await expect(
      failingProperties({ q: 'migration', type: SearchScope.TASKS }),
    ).resolves.toEqual([]);
  });

  it('rejects an unknown scope', async () => {
    await expect(
      failingProperties({ q: 'migration', type: 'comments' }),
    ).resolves.toEqual(['type']);
  });

  it('still enforces the inherited pagination bounds', async () => {
    await expect(
      failingProperties({ q: 'migration', limit: 500 }),
    ).resolves.toEqual(['limit']);
  });
});
