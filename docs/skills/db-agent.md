---
name: db-agent
description: PostgreSQL and multi-tenant database agent for the Zynx AGI platform. Use this skill for all database operations — querying, writing, schema migrations, multi-tenant data isolation, optimistic concurrency control, and audit logging. Triggers on "query the database", "get from DB", "save to database", "run SQL", "migrate schema", "update record", or whenever an agent needs to persist or retrieve structured data. Always use for all data persistence operations.
---

# DB Agent

Manages all PostgreSQL database operations with strict multi-tenant isolation, optimistic concurrency control, and append-only audit logging.

## Responsibilities
- Execute typed queries with parameterized inputs
- Enforce `tenantId` row-level security
- Handle version conflicts with exponential backoff
- Run schema migrations via Drizzle ORM
- Maintain audit log for all mutations

## Input Contract

```typescript
import { z } from 'zod';

export const DBOperationSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('query'),
    table: z.string().min(1),
    filters: z.record(z.unknown()).default({}),
    select: z.array(z.string()).optional(),
    orderBy: z.object({ field: z.string(), dir: z.enum(['asc', 'desc']) }).optional(),
    limit: z.number().int().min(1).max(10_000).default(100),
    offset: z.number().int().min(0).default(0),
    tenantId: z.string().uuid(),
  }),
  z.object({
    op: z.literal('insert'),
    table: z.string().min(1),
    data: z.union([z.record(z.unknown()), z.array(z.record(z.unknown()))]),
    onConflict: z.enum(['error', 'ignore', 'update']).default('error'),
    tenantId: z.string().uuid(),
    userId: z.string().uuid(),
  }),
  z.object({
    op: z.literal('update'),
    table: z.string().min(1),
    id: z.string().uuid(),
    data: z.record(z.unknown()),
    version: z.number().int().positive(),   // Optimistic concurrency
    tenantId: z.string().uuid(),
    userId: z.string().uuid(),
  }),
  z.object({
    op: z.literal('delete'),
    table: z.string().min(1),
    id: z.string().uuid(),
    soft: z.boolean().default(true),         // Soft delete by default
    tenantId: z.string().uuid(),
    userId: z.string().uuid(),
  }),
]);
```

## Output Contract

```typescript
export const DBResultSchema = z.object({
  op: z.string(),
  rows: z.array(z.record(z.unknown())).optional(),
  affected: z.number().int().optional(),
  id: z.string().uuid().optional(),
  version: z.number().int().optional(),
  auditId: z.string().uuid(),
  error: z.discriminatedUnion('code', [
    z.object({ code: z.literal('VERSION_CONFLICT'), currentVersion: z.number() }),
    z.object({ code: z.literal('NOT_FOUND') }),
    z.object({ code: z.literal('CONSTRAINT_VIOLATION'), detail: z.string() }),
  ]).optional(),
});
```

## Core Entities

```sql
-- Five core multi-tenant entities
Tenant, User, Resource, AuditLog, Membership

-- All tables include:
tenant_id UUID NOT NULL,
version   INTEGER DEFAULT 1,
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW(),
deleted_at TIMESTAMPTZ  -- soft delete
```

## Optimistic Concurrency

```typescript
async function update(op: UpdateOp): Promise<DBResult> {
  const result = await db.update(op.table)
    .set({ ...op.data, version: op.version + 1, updatedAt: new Date() })
    .where(and(
      eq(table.id, op.id),
      eq(table.tenantId, op.tenantId),
      eq(table.version, op.version)   // Must match current version
    ));
  if (result.rowCount === 0) throw new VersionConflictError(op.version);
  return buildResult(result);
}
```

## Error Handling
- `VERSION_CONFLICT` → retry with exponential backoff (base 500ms, max 3 retries, full jitter)
- `NOT_FOUND` → return structured error, do not throw
- Always write to AuditLog before returning result
