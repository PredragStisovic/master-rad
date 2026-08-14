import { CacheModuleOptions } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import KeyvRedis from '@keyv/redis';

/**
 * One TTL for every cached read. Reports and search are both derived views that
 * tolerate the same amount of staleness, and nothing invalidates them on write
 * — expiry is the only thing that refreshes them, so it stays short and stays
 * in one place rather than being tuned per endpoint.
 */
export const cacheConfig = (config: ConfigService): CacheModuleOptions => {
  const url = config.get<string>('REDIS_URL');

  return {
    ttl: config.get<number>('CACHE_TTL_MS'),
    // A single shared Redis serves every instance, so a rolling deploy hits
    // entries written by the previous one. Keys carry their own version prefix
    // for that; the namespace only keeps this app off other tenants' keys.
    namespace: 'master-rad',
    ...(url && { stores: new KeyvRedis(url) }),
  };
};
