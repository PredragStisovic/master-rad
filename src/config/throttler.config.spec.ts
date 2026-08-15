import { ConfigService } from '@nestjs/config';
import { ThrottlerOptions } from '@nestjs/throttler';
import { AUTH_THROTTLER, throttlerConfig } from './throttler.config';

const configServiceMock = (values: Record<string, number>): ConfigService =>
  ({
    getOrThrow: jest.fn((key: string) => {
      if (!(key in values)) {
        throw new Error(`Missing configuration key "${key}"`);
      }

      return values[key];
    }),
  }) as unknown as ConfigService;

const throttlersOf = (config: ConfigService): ThrottlerOptions[] =>
  (throttlerConfig(config) as { throttlers: ThrottlerOptions[] }).throttlers;

describe('throttlerConfig', () => {
  it('builds a single named bucket from the environment', () => {
    const throttlers = throttlersOf(
      configServiceMock({
        AUTH_THROTTLE_TTL_MS: 60_000,
        AUTH_THROTTLE_LIMIT: 10,
      }),
    );

    expect(throttlers).toEqual([
      { name: AUTH_THROTTLER, ttl: 60_000, limit: 10 },
    ]);
  });

  it('carries the configured window and limit through unchanged', () => {
    const throttlers = throttlersOf(
      configServiceMock({
        AUTH_THROTTLE_TTL_MS: 5_000,
        AUTH_THROTTLE_LIMIT: 3,
      }),
    );

    expect({ ttl: throttlers[0].ttl, limit: throttlers[0].limit }).toEqual({
      ttl: 5_000,
      limit: 3,
    });
  });

  it('fails loudly when the throttle settings are missing', () => {
    expect(() => throttlerConfig(configServiceMock({}))).toThrow(
      'Missing configuration key "AUTH_THROTTLE_TTL_MS"',
    );
  });
});
