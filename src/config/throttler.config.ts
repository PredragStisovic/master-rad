import { ConfigService } from '@nestjs/config';
import { ThrottlerModuleOptions } from '@nestjs/throttler';

/**
 * Name of the single configured rate-limit bucket. Only the auth endpoints opt
 * into it — every other route stays unthrottled, so the guard is mounted on the
 * auth controller rather than globally.
 */
export const AUTH_THROTTLER = 'auth';

/**
 * Credential-facing endpoints are the ones worth limiting: `login` and
 * `refresh` are the two places an attacker can guess a secret, and `register`
 * is the one place an anonymous caller can write to the database. The bucket is
 * keyed by client IP (the throttler's default tracker) because the caller is
 * unauthenticated at exactly the moment the limit has to apply. That is the
 * socket address, so a deployment behind a proxy has to turn on Express'
 * `trust proxy` for the key to be the real client rather than the hop in front.
 *
 * The default store is in-process, so each instance counts its own traffic. For
 * a single-instance deployment that is the whole limit; behind a load balancer
 * the effective ceiling multiplies by the instance count, which still bounds
 * brute force by orders of magnitude and keeps Redis off the request path.
 */
export const throttlerConfig = (
  config: ConfigService,
): ThrottlerModuleOptions => ({
  throttlers: [
    {
      name: AUTH_THROTTLER,
      ttl: config.getOrThrow<number>('AUTH_THROTTLE_TTL_MS'),
      limit: config.getOrThrow<number>('AUTH_THROTTLE_LIMIT'),
    },
  ],
});
