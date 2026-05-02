---
name: memory-manager
description: Context and state store for the Zynx AGI platform. Use this skill for storing, retrieving, and managing short-term (session), long-term (user/tenant), and episodic (task history) memory across agent executions. Triggers when any agent needs to persist context, recall previous interactions, store embeddings, or when the user says "remember", "recall", "what did we discuss", or "load context". Always use for stateful agent conversations.
---

# Memory Manager

Manages multi-scope memory storage for the Zynx AGI platform: session memory (Redis), long-term memory (PostgreSQL + pgvector), and episodic memory (vector search).

## Memory Scopes

| Scope | Backend | TTL | Use Case |
|---|---|---|---|
| `session` | Redis | 30min | Current conversation context |
| `user` | PostgreSQL | ∞ | Preferences, history |
| `tenant` | PostgreSQL | ∞ | Org-level shared context |
| `episodic` | pgvector | 90 days | Searchable past interactions |
| `working` | In-process | Request | Current task state |

## Input Contract

```typescript
import { z } from 'zod';

export const MemoryOpSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('store'),
    scope: z.enum(['session', 'user', 'tenant', 'episodic', 'working']),
    key: z.string().min(1).max(256),
    value: z.unknown(),
    ttlSeconds: z.number().int().positive().optional(),
    tenantId: z.string().uuid(),
    userId: z.string().uuid().optional(),
    sessionId: z.string().uuid().optional(),
  }),
  z.object({
    op: z.literal('retrieve'),
    scope: z.enum(['session', 'user', 'tenant', 'episodic', 'working']),
    key: z.string().min(1).max(256),
    tenantId: z.string().uuid(),
    userId: z.string().uuid().optional(),
  }),
  z.object({
    op: z.literal('search'),
    query: z.string().min(1),
    scope: z.enum(['episodic', 'user', 'tenant']),
    topK: z.number().int().min(1).max(50).default(5),
    tenantId: z.string().uuid(),
    userId: z.string().uuid().optional(),
  }),
  z.object({
    op: z.literal('delete'),
    scope: z.enum(['session', 'user', 'tenant', 'working']),
    key: z.string().min(1).max(256),
    tenantId: z.string().uuid(),
  }),
]);
```

## Output Contract

```typescript
export const MemoryResultSchema = z.object({
  op: z.string(),
  success: z.boolean(),
  data: z.unknown().optional(),
  hits: z.array(z.object({
    key: z.string(),
    value: z.unknown(),
    score: z.number().optional(),
    createdAt: z.string().datetime(),
  })).optional(),
  error: z.string().optional(),
});
```

## Implementation Notes
- All `store` ops encrypt values at rest (AES-256-GCM)
- `episodic` stores both raw text and embedding vector
- `search` uses cosine similarity on pgvector
- Enforce tenant isolation at query level — always filter by `tenantId`
- Cache `retrieve` results in working scope for request duration
