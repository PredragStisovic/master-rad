import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCommentDto } from './create-comment.dto';
import { UpdateCommentDto } from './update-comment.dto';

const failingProperties = async (
  cls: typeof CreateCommentDto | typeof UpdateCommentDto,
  payload: Record<string, unknown>,
): Promise<string[]> => {
  const errors = await validate(plainToInstance(cls, payload));

  return errors.map((error) => error.property);
};

describe('CreateCommentDto', () => {
  it('accepts a body', async () => {
    await expect(
      failingProperties(CreateCommentDto, { body: 'Looks good to me' }),
    ).resolves.toEqual([]);
  });

  it('rejects a missing body', async () => {
    await expect(failingProperties(CreateCommentDto, {})).resolves.toEqual([
      'body',
    ]);
  });

  it('rejects a blank body', async () => {
    await expect(
      failingProperties(CreateCommentDto, { body: '' }),
    ).resolves.toEqual(['body']);
  });

  it('rejects a body longer than 2000 characters', async () => {
    await expect(
      failingProperties(CreateCommentDto, { body: 'a'.repeat(2001) }),
    ).resolves.toEqual(['body']);
  });

  it('rejects a non-string body', async () => {
    await expect(
      failingProperties(CreateCommentDto, { body: 42 }),
    ).resolves.toEqual(['body']);
  });
});

describe('UpdateCommentDto', () => {
  it('accepts an empty payload', async () => {
    await expect(failingProperties(UpdateCommentDto, {})).resolves.toEqual([]);
  });

  it('still validates the body it does receive', async () => {
    await expect(
      failingProperties(UpdateCommentDto, { body: 'a'.repeat(2001) }),
    ).resolves.toEqual(['body']);
  });
});
