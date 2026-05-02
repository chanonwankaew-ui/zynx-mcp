---
name: logger
description: Centralized audit trail and logging agent for the Zynx AGI platform. Use this skill for recording all system events, agent interactions, security audits, performance metrics, and error logs. Triggers on "log this", "record event", "audit log", "error report", "track performance", or at the completion of any agent operation. Provides searchable, immutable logs for compliance and debugging.
---

# Logger

High-performance, immutable logging and audit trail system for the Zynx AGI platform, supporting structured logs and distributed tracing.

## Capabilities
- Structured logging (JSON) with context injection
- Security audit trail (immutable, append-only)
- Distributed tracing (TraceID/SpanID propagation)
- Performance metric collection (Latency, CPU, Memory)
- Error aggregation and alerting integration
- Searchable log indexing (via ELK/Elastic or Axiom)

## Input Contract

```typescript
import { z } from 'zod';

export const LogEntrySchema = z.object({
  level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'security']),
  message: z.string().min(1),
  agentId: z.string().optional(),
  traceId: z.string().uuid().optional(),
  spanId: z.string().optional(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  context: z.record(z.unknown()).default({}),
  error: z.object({
    message: z.string(),
    stack: z.string().optional(),
    code: z.string().optional(),
  }).optional(),
  timestamp: z.string().datetime().default(() => new Date().toISOString()),
});
```

## Output Contract

```typescript
export const LogResultSchema = z.object({
  success: z.boolean(),
  logId: z.string().optional(),
  destination: z.string().optional(),
  error: z.string().optional(),
});
```

## Storage Strategy
- **Application Logs**: Streamed to stdout (JSON) → Log Aggregator
- **Audit Logs**: Persisted in `AuditLog` table (PostgreSQL) via DB Agent
- **Security Logs**: Mirrored to high-durability cold storage (S3/GCS)
- **Metrics**: Exported to Prometheus/Grafana or Datadog

## Standard Context Fields
- `request_id`: Unique ID for the entire user request
- `tenant_id`: For strict multi-tenant filtering
- `duration_ms`: Latency of the logged operation
- `source`: Service or agent name
