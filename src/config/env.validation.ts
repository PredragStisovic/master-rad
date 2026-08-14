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
});
