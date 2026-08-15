import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  // Optional on purpose: with no Redis reachable the cache falls back to an
  // in-process store, so a checkout runs (and the e2e suite passes) without
  // standing one up.
  // `.empty('')` so a copied-but-unfilled `.env` reads as "not configured"
  // rather than as a validation failure.
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .empty('')
    .optional(),
  CACHE_TTL_MS: Joi.number().integer().min(0).empty('').default(30_000),
  // Rate limit applied to the auth endpoints: `AUTH_THROTTLE_LIMIT` requests
  // per client IP within `AUTH_THROTTLE_TTL_MS`. The defaults leave room for a
  // person fumbling a password (and for a browser refreshing a few tabs at
  // once) while cutting credential stuffing down to a trickle.
  AUTH_THROTTLE_TTL_MS: Joi.number().integer().min(1).empty('').default(60_000),
  AUTH_THROTTLE_LIMIT: Joi.number().integer().min(1).empty('').default(10),
});
