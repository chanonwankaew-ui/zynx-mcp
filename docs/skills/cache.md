---
name: cache-agent
description: Redis caching layer for the Zynx AGI platform. Use this skill for all caching operations — storing, retrieving, invalidating, and managing TTL for cached data. Triggers on "cache this", "check cache", "invalidate cache", "store in Redis", "get from cache", or when any agent needs to reduce database load or speed up repeated data access. Always check cache before querying the database.
---

# Cache Agent

Manages Redis-based caching with namespace isolation, TTL management, and cache invalidation patterns for the Zynx platform.

## Cache Namespaces

| Namespace | TTL | Content |
|---|---|---|
| `session:*` | 30min | User session data |
| `api:*` | 5min | API response cache |
| `tenant:*` | 60min | Tenant config |
| `llm:*` | 24hr | LLM response cache |
| `embed:*` | 7d | Embedding vectors |
| `rate:*` | 1min | Rate limit counters |

## Input Contract

```typescript
import { z } from 'zod';

export const CacheOpSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('get'),
    key: z.string().min(1).max(512),
    tenantId: z.string().uuid(),
  }),
  z.object({
    op: z.literal('set'),
    key: z.string().min(1).max(512),
    value: z.unknown(),
    ttlSeconds: z.number().int().min(1).max(604_800).default(300),
    tenantId: z.string().uuid(),
    compress: z.boolean().default(false),
  }),
  z.object({
    op: z.literal('invalidate'),
    pattern: z.string().min(1),   // Glob pattern e.g. "user:abc-*"
    tenantId: z.string().uuid(),
  }),
  z.object({
    op: z.literal('increment'),
    key: z.string().min(1).max(512),
    by: z.number().int().default(1),
    ttlSeconds: z.number().int().min(1).default(60),
    tenantId: z.string().uuid(),
  }),
]);
```

## Output Contract

```typescript
export const CacheResultSchema = z.object({
  op: z.string(),
  hit: z.boolean().optional(),
  value: z.unknown().optional(),
  ttlRemaining: z.number().int().optional(),
  invalidatedCount: z.number().int().optional(),
  counter: z.number().int().optional(),
  error: z.string().optional(),
});
```

## Cache-Aside Pattern

```typescript
async function getOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number,
  tenantId: string,
): Promise<T> {
  const cached = await cacheAgent.get({ op: 'get', key, tenantId });
  if (cached.hit && cached.value !== undefined) return cached.value as T;
  const fresh = await fetcher();
  await cacheAgent.set({ op: 'set', key, value: fresh, ttlSeconds, tenantId });
  return fresh;
}
```

## Error Handling
- Redis unavailable → log warn, bypass cache (never fail request)
- Serialization error → log error, store as JSON string
- Key too large → reject with `KEY_TOO_LARGE` error
